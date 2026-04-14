import { system, world } from "@minecraft/server";

import {
  CLAN_RECALL_CLOCK_DROP_CHANCE,
  CLAN_RECALL_CLOCK_ID_PROPERTY,
  CLAN_RECALL_CLOCK_ITEM_ID,
  CLAN_RECALL_CLOCK_LORE_KEY,
  CLAN_RECALL_CLOCK_MAX_ACTIVE,
  CLAN_RECALL_CLOCK_NAME,
  CLAN_RECALL_CLOCK_USE_COOLDOWN_TICKS,
  CLAN_RECALL_CLOCKS_PROPERTY,
  CLAN_THREAT_SPECIAL_TAG,
} from "../config.js";
import { getItemLore } from "../utils/item.js";
import { createItemStack, getPlayerInventory, getPlayerName, isPlayerEntity, sendPlayerMessage } from "../utils/player.js";
import { logError, runSafely } from "../utils/runtime.js";

const DIMENSION_IDS = ["overworld", "nether", "the_end"];
const activeRecallClockIds = new Set();
const lastRecallUseTickByPlayer = new Map();

function createRecallClockId() {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0x100000000).toString(36)}-${system.currentTick}`;
}

function getDamageSourcePlayer(damageSource) {
  const damagingEntity = damageSource?.damagingEntity;
  if (isPlayerEntity(damagingEntity)) {
    return damagingEntity;
  }

  const projectileOwner = damageSource?.damagingProjectile?.owner;
  if (isPlayerEntity(projectileOwner)) {
    return projectileOwner;
  }

  return undefined;
}

function getRecallClockIdFromLore(itemStack) {
  const lore = getItemLore(itemStack);
  if (!lore.includes(CLAN_RECALL_CLOCK_LORE_KEY)) {
    return undefined;
  }

  const idLine = lore.find((line) => line.startsWith("Id: "));
  return idLine?.slice(4).trim();
}

export function getRecallClockId(itemStack) {
  if (!itemStack || itemStack.typeId !== CLAN_RECALL_CLOCK_ITEM_ID || itemStack.nameTag !== CLAN_RECALL_CLOCK_NAME) {
    return undefined;
  }

  const dynamicId = runSafely("getRecallClockId.dynamicProperty", () => itemStack.getDynamicProperty(CLAN_RECALL_CLOCK_ID_PROPERTY));
  if (typeof dynamicId === "string" && dynamicId.length > 0) {
    return dynamicId;
  }

  return getRecallClockIdFromLore(itemStack);
}

export function isRecallClockItem(itemStack) {
  return Boolean(getRecallClockId(itemStack));
}

function createRecallClockItem(clockId) {
  return runSafely("createRecallClockItem", () => {
    const clock = createItemStack(CLAN_RECALL_CLOCK_ITEM_ID, 1);
    if (!clock) {
      return undefined;
    }

    clock.nameTag = CLAN_RECALL_CLOCK_NAME;
    runSafely("createRecallClockItem.setDynamicProperty", () => {
      clock.setDynamicProperty(CLAN_RECALL_CLOCK_ID_PROPERTY, clockId);
    });
    runSafely("createRecallClockItem.setLore", () => {
      clock.setLore([
        CLAN_RECALL_CLOCK_LORE_KEY,
        `Id: ${clockId}`,
        "Use to return to your bed.",
        `Only ${CLAN_RECALL_CLOCK_MAX_ACTIVE} can exist in the active world.`,
      ]);
    });

    return clock;
  });
}

function loadActiveRecallClockIdsFromProperty() {
  activeRecallClockIds.clear();

  const rawIds = world.getDynamicProperty(CLAN_RECALL_CLOCKS_PROPERTY);
  if (typeof rawIds !== "string" || rawIds.length === 0) {
    return;
  }

  let parsedIds;
  try {
    parsedIds = JSON.parse(rawIds);
  } catch (error) {
    logError("loadActiveRecallClockIds.parse", error);
    return;
  }

  if (!Array.isArray(parsedIds)) {
    return;
  }

  for (const id of parsedIds) {
    if (typeof id === "string" && id.length > 0) {
      activeRecallClockIds.add(id);
    }
  }
}

function saveActiveRecallClockIds() {
  return runSafely("saveActiveRecallClockIds", () => {
    world.setDynamicProperty(CLAN_RECALL_CLOCKS_PROPERTY, JSON.stringify([...activeRecallClockIds]));
    return true;
  }) === true;
}

function addActiveRecallClockId(clockId) {
  if (activeRecallClockIds.size >= CLAN_RECALL_CLOCK_MAX_ACTIVE) {
    return false;
  }

  activeRecallClockIds.add(clockId);
  return saveActiveRecallClockIds();
}

function releaseMissingRecallClockIds(foundIds) {
  let changed = false;
  for (const clockId of activeRecallClockIds) {
    if (!foundIds.has(clockId)) {
      activeRecallClockIds.delete(clockId);
      changed = true;
    }
  }

  if (changed) {
    saveActiveRecallClockIds();
  }
}

function scanPlayerRecallClocks(player, foundIds) {
  const inventory = getPlayerInventory(player);
  if (!inventory) {
    return;
  }

  for (let slot = 0; slot < inventory.size; slot += 1) {
    const item = inventory.getItem(slot);
    const clockId = getRecallClockId(item);
    if (!clockId) {
      continue;
    }

    if (activeRecallClockIds.has(clockId) || activeRecallClockIds.size < CLAN_RECALL_CLOCK_MAX_ACTIVE) {
      activeRecallClockIds.add(clockId);
      foundIds.add(clockId);
      continue;
    }

    inventory.setItem(slot);
    sendPlayerMessage(player, "Um relogio de retorno excedia o limite global e foi removido.");
  }
}

function scanDroppedRecallClocks(foundIds) {
  for (const dimensionId of DIMENSION_IDS) {
    const dimension = runSafely(`scanDroppedRecallClocks.dimension.${dimensionId}`, () => world.getDimension(dimensionId));
    if (!dimension) {
      continue;
    }

    const itemEntities = runSafely(`scanDroppedRecallClocks.entities.${dimensionId}`, () => {
      return dimension.getEntities({ type: "minecraft:item" });
    }) ?? [];

    for (const itemEntity of itemEntities) {
      const itemComponent = runSafely("scanDroppedRecallClocks.itemComponent", () => itemEntity.getComponent("minecraft:item"));
      const itemStack = itemComponent?.itemStack;
      const clockId = getRecallClockId(itemStack);
      if (!clockId) {
        continue;
      }

      if (activeRecallClockIds.has(clockId) || activeRecallClockIds.size < CLAN_RECALL_CLOCK_MAX_ACTIVE) {
        activeRecallClockIds.add(clockId);
        foundIds.add(clockId);
        continue;
      }

      runSafely("scanDroppedRecallClocks.removeExtra", () => itemEntity.remove());
    }
  }
}

export function loadRecallClocks() {
  loadActiveRecallClockIdsFromProperty();
  system.runTimeout(reconcileRecallClocks, 20);
}

export function reconcileRecallClocks() {
  const foundIds = new Set();

  for (const player of world.getPlayers()) {
    scanPlayerRecallClocks(player, foundIds);
  }

  scanDroppedRecallClocks(foundIds);
  releaseMissingRecallClockIds(foundIds);
  saveActiveRecallClockIds();
}

function giveRecallClockToPlayer(player) {
  reconcileRecallClocks();

  if (activeRecallClockIds.size >= CLAN_RECALL_CLOCK_MAX_ACTIVE) {
    return false;
  }

  const clockId = createRecallClockId();
  const clock = createRecallClockItem(clockId);
  if (!clock || !addActiveRecallClockId(clockId)) {
    return false;
  }

  const inventory = getPlayerInventory(player);
  if (!inventory) {
    runSafely("giveRecallClockToPlayer.spawnNoInventory", () => {
      player.dimension.spawnItem(clock, player.location);
    });
    return true;
  }

  const leftover = inventory.addItem(clock);
  if (leftover) {
    runSafely("giveRecallClockToPlayer.spawnLeftover", () => {
      player.dimension.spawnItem(leftover, player.location);
    });
  }

  sendPlayerMessage(player, "Voce encontrou um Relogio de Retorno do Clan.");
  return true;
}

function isSpecialThreatDeath(deadEntity) {
  return runSafely("isSpecialThreatDeath.hasTag", () => deadEntity?.hasTag(CLAN_THREAT_SPECIAL_TAG)) === true;
}

export function handleRecallClockDrop(event) {
  const deadEntity = event.deadEntity ?? event.entity;
  if (!deadEntity || !isSpecialThreatDeath(deadEntity)) {
    return false;
  }

  if (Math.random() >= CLAN_RECALL_CLOCK_DROP_CHANCE) {
    return false;
  }

  const killer = getDamageSourcePlayer(event.damageSource);
  if (!killer) {
    return false;
  }

  return giveRecallClockToPlayer(killer);
}

function getSafeRecallLocation(dimension, location) {
  const x = Math.floor(location.x);
  const z = Math.floor(location.z);
  const baseY = Math.floor(location.y);

  for (let yOffset = 0; yOffset <= 8; yOffset += 1) {
    const y = baseY + yOffset;
    const feet = runSafely("getSafeRecallLocation.feet.up", () => dimension.getBlock({ x, y, z }));
    const head = runSafely("getSafeRecallLocation.head.up", () => dimension.getBlock({ x, y: y + 1, z }));
    if (feet?.isAir && head?.isAir) {
      return { x: x + 0.5, y, z: z + 0.5 };
    }
  }

  for (let yOffset = 1; yOffset <= 4; yOffset += 1) {
    const y = baseY - yOffset;
    const feet = runSafely("getSafeRecallLocation.feet.down", () => dimension.getBlock({ x, y, z }));
    const head = runSafely("getSafeRecallLocation.head.down", () => dimension.getBlock({ x, y: y + 1, z }));
    if (feet?.isAir && head?.isAir) {
      return { x: x + 0.5, y, z: z + 0.5 };
    }
  }

  return { x: x + 0.5, y: baseY, z: z + 0.5 };
}

function canUseRecallClock(player) {
  const playerName = getPlayerName(player) ?? player.id;
  const lastUseTick = lastRecallUseTickByPlayer.get(playerName) ?? -CLAN_RECALL_CLOCK_USE_COOLDOWN_TICKS;
  if (system.currentTick - lastUseTick < CLAN_RECALL_CLOCK_USE_COOLDOWN_TICKS) {
    return false;
  }

  lastRecallUseTickByPlayer.set(playerName, system.currentTick);
  return true;
}

function getPlayerBedSpawnPoint(player) {
  return runSafely("getPlayerBedSpawnPoint.getSpawnPoint", () => {
    if (typeof player.getSpawnPoint === "function") {
      return player.getSpawnPoint();
    }

    return player.spawnPoint;
  });
}

export function handleRecallClockUse(event) {
  const player = event.source ?? event.player;
  const itemStack = event.itemStack ?? event.item;
  if (!player || !isRecallClockItem(itemStack) || !canUseRecallClock(player)) {
    return;
  }

  const spawnPoint = getPlayerBedSpawnPoint(player);
  if (!spawnPoint) {
    sendPlayerMessage(player, "Voce precisa dormir em uma cama antes de usar o relogio de retorno.");
    return;
  }

  const dimension = spawnPoint.dimension ?? runSafely("handleRecallClockUse.getDimension", () => world.getDimension(spawnPoint.dimensionId));
  if (!dimension) {
    sendPlayerMessage(player, "Nao foi possivel encontrar a dimensao da sua cama.");
    return;
  }

  const destination = getSafeRecallLocation(dimension, spawnPoint);
  const teleported = runSafely("handleRecallClockUse.teleport", () => {
    player.teleport(destination, {
      dimension,
      checkForBlocks: false,
    });
    return true;
  }) === true;

  if (teleported) {
    sendPlayerMessage(player, "Voce voltou para sua cama.");
  }
}
