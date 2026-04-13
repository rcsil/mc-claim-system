import { ItemStack, ItemTypes, world } from "@minecraft/server";

import { DEBUG_PREFIX } from "../config.js";
import { runSafely } from "./runtime.js";

export function isPlayerEntity(entity) {
  return entity?.typeId === "minecraft:player";
}

export function getPlayerName(player) {
  if (!isPlayerEntity(player)) {
    return undefined;
  }

  const name = typeof player.name === "string" && player.name.length > 0 ? player.name : player.nameTag;
  return name || undefined;
}

export function sendPlayerMessage(player, message) {
  runSafely("sendPlayerMessage", () => {
    player.sendMessage(`${DEBUG_PREFIX} ${message}`);
  });
}

export function getPlayerInventory(player) {
  return runSafely("getPlayerInventory", () => player.getComponent("minecraft:inventory")?.container);
}

export function countItem(container, itemTypeId) {
  let total = 0;

  for (let slot = 0; slot < container.size; slot += 1) {
    const item = container.getItem(slot);
    if (item?.typeId === itemTypeId) {
      total += item.amount;
    }
  }

  return total;
}

export function consumeItem(container, itemTypeId, amountToConsume) {
  let remaining = amountToConsume;

  for (let slot = 0; slot < container.size; slot += 1) {
    const item = container.getItem(slot);
    if (!item || item.typeId !== itemTypeId) {
      continue;
    }

    if (item.amount <= remaining) {
      remaining -= item.amount;
      container.setItem(slot);
    } else {
      item.amount -= remaining;
      container.setItem(slot, item);
      remaining = 0;
    }

    if (remaining === 0) {
      return true;
    }
  }

  return false;
}

export function createItemStack(itemTypeId, amount = 1) {
  return runSafely(`createItemStack.${itemTypeId}`, () => {
    const itemType = ItemTypes.get(itemTypeId);
    if (!itemType) {
      throw new Error(`Item type nao encontrado: ${itemTypeId}`);
    }

    return new ItemStack(itemType, amount);
  });
}

export function findOnlinePlayerByName(rawPlayerName) {
  if (typeof rawPlayerName !== "string" || rawPlayerName.trim().length === 0) {
    return undefined;
  }

  const normalizedName = rawPlayerName.trim().toLowerCase();

  for (const player of world.getPlayers()) {
    const playerName = getPlayerName(player);
    if (playerName?.toLowerCase() === normalizedName) {
      return player;
    }
  }

  return undefined;
}
