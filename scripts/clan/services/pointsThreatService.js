import { system, world } from "@minecraft/server";
import * as mc from "@minecraft/server";

import {
  CLAN_THREAT_COMMON_ENTITY_TYPES,
  CLAN_THREAT_CREAKING_HEALTH,
  CLAN_THREAT_DESPAWN_DISTANCE,
  CLAN_THREAT_INFESTATION_ENTITY_TYPES,
  CLAN_THREAT_INFESTATION_MIN_POINTS,
  CLAN_THREAT_INFESTATION_SPAWN_COUNT,
  CLAN_THREAT_LEVEL_SPAWN_LIMIT,
  CLAN_THREAT_LEVEL_SPAWN_MULTIPLIER,
  CLAN_THREAT_MAX_ACTIVE_NEAR_PLAYER,
  CLAN_THREAT_MAX_DISTANCE,
  CLAN_THREAT_MIN_DISTANCE,
  CLAN_THREAT_SPAWN_ATTEMPTS,
  CLAN_THREAT_SPECIAL_ATTACK_COOLDOWN_TICKS,
  CLAN_THREAT_SPECIAL_ATTACK_DAMAGE,
  CLAN_THREAT_SPECIAL_ATTACK_RANGE,
  CLAN_THREAT_SPECIAL_ENTITY_TYPES,
  CLAN_THREAT_SPECIAL_MIN_POINTS,
  CLAN_THREAT_SPECIAL_SPAWN_CHANCE,
  CLAN_THREAT_SPECIAL_TAG,
  CLAN_THREAT_TAG,
} from "../config.js";
import { getPlayerPoints } from "../state/pointsStore.js";
import { getPlayerName } from "../utils/player.js";
import { runSafely } from "../utils/runtime.js";
import { sendRateLimitedMessage } from "./notifications.js";

const activeSpecialThreats = new Map();

function getHealthComponent(entity) {
  const healthComponentType = mc.EntityComponentTypes?.Health ?? "minecraft:health";
  return runSafely("pointsThreat.getHealthComponent", () => entity.getComponent(healthComponentType));
}

function getPlayerLevel(player) {
  const level = Number(player?.level);
  if (Number.isFinite(level)) {
    return Math.max(0, Math.floor(level));
  }

  const xpLevel = Number(player?.xpLevel);
  if (Number.isFinite(xpLevel)) {
    return Math.max(0, Math.floor(xpLevel));
  }

  return 0;
}

function getLevelThreatSpawnCount(player) {
  return Math.min(CLAN_THREAT_LEVEL_SPAWN_LIMIT, getPlayerLevel(player) * CLAN_THREAT_LEVEL_SPAWN_MULTIPLIER);
}

function getThreatTier(player, points) {
  if (points < CLAN_THREAT_INFESTATION_MIN_POINTS) {
    const spawnCount = getLevelThreatSpawnCount(player);
    if (spawnCount <= 0) {
      return undefined;
    }

    return {
      key: "level",
      entityTypes: CLAN_THREAT_COMMON_ENTITY_TYPES,
      spawnCount,
    };
  }

  if (points < CLAN_THREAT_SPECIAL_MIN_POINTS) {
    return {
      key: "infestation",
      entityTypes: CLAN_THREAT_INFESTATION_ENTITY_TYPES,
      spawnCount: CLAN_THREAT_INFESTATION_SPAWN_COUNT,
    };
  }

  return {
    key: "special",
    entityTypes: CLAN_THREAT_INFESTATION_ENTITY_TYPES,
    spawnCount: CLAN_THREAT_INFESTATION_SPAWN_COUNT,
  };
}

function getRandomEntry(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function getDistance(left, right) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const dz = left.z - right.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isValidThreatEntity(entity) {
  return Boolean(entity) && entity.isValid !== false;
}

function isSpawnableBlock(block) {
  return Boolean(block) && block.isAir;
}

function isSolidSpawnFloor(block) {
  return Boolean(block) && !block.isAir && !block.isLiquid;
}

function findSpawnLocation(player) {
  const dimension = player.dimension;
  const playerLocation = player.location;

  for (let attempt = 0; attempt < CLAN_THREAT_SPAWN_ATTEMPTS; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = CLAN_THREAT_MIN_DISTANCE + Math.random() * (CLAN_THREAT_MAX_DISTANCE - CLAN_THREAT_MIN_DISTANCE);
    const x = Math.floor(playerLocation.x + Math.cos(angle) * distance);
    const z = Math.floor(playerLocation.z + Math.sin(angle) * distance);
    const baseY = Math.floor(playerLocation.y);

    for (let yOffset = 4; yOffset >= -8; yOffset -= 1) {
      const y = baseY + yOffset;
      const below = runSafely("pointsThreat.findSpawnLocation.below", () => dimension.getBlock({ x, y: y - 1, z }));
      const feet = runSafely("pointsThreat.findSpawnLocation.feet", () => dimension.getBlock({ x, y, z }));
      const head = runSafely("pointsThreat.findSpawnLocation.head", () => dimension.getBlock({ x, y: y + 1, z }));
      const upperHead = runSafely("pointsThreat.findSpawnLocation.upperHead", () => dimension.getBlock({ x, y: y + 2, z }));

      if (isSolidSpawnFloor(below) && isSpawnableBlock(feet) && isSpawnableBlock(head) && isSpawnableBlock(upperHead)) {
        return { x: x + 0.5, y, z: z + 0.5 };
      }
    }
  }

  return undefined;
}

function countActiveThreatsNearPlayer(player) {
  return runSafely("pointsThreat.countActiveThreatsNearPlayer", () => {
    return player.dimension.getEntities({
      location: player.location,
      maxDistance: CLAN_THREAT_DESPAWN_DISTANCE,
      tags: [CLAN_THREAT_TAG],
    }).length;
  }) ?? 0;
}

function setEntityHealth(entity, healthValue) {
  const health = getHealthComponent(entity);
  const effectiveMax = runSafely("pointsThreat.health.effectiveMax", () => health?.effectiveMax) ?? 0;

  if (effectiveMax < healthValue) {
    const amplifier = Math.max(0, Math.ceil((healthValue - effectiveMax) / 4) - 1);
    runSafely("pointsThreat.creaking.healthBoost", () => {
      entity.addEffect("health_boost", 20 * 60 * 10, {
        amplifier,
        showParticles: false,
      });
    });
  }

  system.runTimeout(() => {
    const updatedHealth = getHealthComponent(entity);
    const updatedMax = runSafely("pointsThreat.health.updatedMax", () => updatedHealth?.effectiveMax) ?? healthValue;
    runSafely("pointsThreat.health.setCurrentValue", () => {
      updatedHealth?.setCurrentValue(Math.min(healthValue, updatedMax));
    });
  }, 1);
}

function prepareThreatEntity(entity, player, options = {}) {
  if (!entity) {
    return;
  }

  runSafely("pointsThreat.addTag", () => entity.addTag(CLAN_THREAT_TAG));

  if (!options.special) {
    return;
  }

  const playerName = getPlayerName(player);
  runSafely("pointsThreat.addSpecialTag", () => entity.addTag(CLAN_THREAT_SPECIAL_TAG));
  runSafely("pointsThreat.lookAt", () => entity.lookAt(player.location));

  if (options.typeId === "minecraft:creaking") {
    setEntityHealth(entity, CLAN_THREAT_CREAKING_HEALTH);
  }

  activeSpecialThreats.set(entity.id, {
    entity,
    targetName: playerName,
    typeId: options.typeId,
    nextAttackTick: system.currentTick + CLAN_THREAT_SPECIAL_ATTACK_COOLDOWN_TICKS,
  });
}

function spawnThreatEntity(player, typeId, options = {}) {
  const location = findSpawnLocation(player);
  if (!location) {
    return false;
  }

  const entity = runSafely(`pointsThreat.spawn.${typeId}`, () => player.dimension.spawnEntity(typeId, location));
  if (!entity) {
    return false;
  }

  prepareThreatEntity(entity, player, { ...options, typeId });
  return true;
}

function spawnRegularThreats(player, tier) {
  let spawned = 0;
  const activeThreats = countActiveThreatsNearPlayer(player);
  const availableSlots = Math.max(0, CLAN_THREAT_MAX_ACTIVE_NEAR_PLAYER - activeThreats);
  const spawnCount = Math.min(tier.spawnCount, availableSlots);

  for (let index = 0; index < spawnCount; index += 1) {
    if (spawnThreatEntity(player, getRandomEntry(tier.entityTypes))) {
      spawned += 1;
    }
  }

  return spawned;
}

function spawnSpecialThreat(player) {
  if (Math.random() > CLAN_THREAT_SPECIAL_SPAWN_CHANCE) {
    return false;
  }

  const typeId = getRandomEntry(CLAN_THREAT_SPECIAL_ENTITY_TYPES);
  return spawnThreatEntity(player, typeId, { special: true });
}

function getPlayerByName(playerName) {
  if (!playerName) {
    return undefined;
  }

  const normalizedName = playerName.toLowerCase();
  return world.getPlayers().find((player) => getPlayerName(player)?.toLowerCase() === normalizedName);
}

function moveThreatTowardPlayer(entity, player) {
  const entityLocation = entity.location;
  const playerLocation = player.location;
  const dx = playerLocation.x - entityLocation.x;
  const dz = playerLocation.z - entityLocation.z;
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

  runSafely("pointsThreat.special.lookAt", () => entity.lookAt(playerLocation));

  if (horizontalDistance < 0.1 || horizontalDistance > CLAN_THREAT_DESPAWN_DISTANCE) {
    return;
  }

  runSafely("pointsThreat.special.applyImpulse", () => {
    entity.applyImpulse({
      x: (dx / horizontalDistance) * 0.12,
      y: 0,
      z: (dz / horizontalDistance) * 0.12,
    });
  });
}

function applySpecialThreatDamage(entity, player) {
  const damageCause = mc.EntityDamageCause?.entityAttack ?? "entityAttack";
  const damagedWithSource = runSafely("pointsThreat.special.applyDamageWithSource", () => {
    return player.applyDamage(CLAN_THREAT_SPECIAL_ATTACK_DAMAGE, {
      cause: damageCause,
      damagingEntity: entity,
    });
  });

  if (damagedWithSource !== true) {
    runSafely("pointsThreat.special.applyDamage", () => {
      player.applyDamage(CLAN_THREAT_SPECIAL_ATTACK_DAMAGE);
    });
  }
}

export function updatePointThreatSpawns() {
  for (const player of world.getPlayers()) {
    const points = getPlayerPoints(player);
    const tier = getThreatTier(player, points);
    if (!tier) {
      continue;
    }

    spawnRegularThreats(player, tier);
    if (tier.key === "special" && spawnSpecialThreat(player)) {
      sendRateLimitedMessage(player, "pointsThreat.special", "Seus pontos atraem uma ameaca especial.");
    }
  }
}

export function updatePointThreatSpecials() {
  const currentTick = system.currentTick;

  for (const [entityId, threat] of activeSpecialThreats.entries()) {
    const { entity, targetName } = threat;
    const player = getPlayerByName(targetName);

    if (!isValidThreatEntity(entity) || !player || entity.dimension?.id !== player.dimension?.id) {
      activeSpecialThreats.delete(entityId);
      continue;
    }

    const distance = getDistance(entity.location, player.location);
    if (distance > CLAN_THREAT_DESPAWN_DISTANCE) {
      activeSpecialThreats.delete(entityId);
      continue;
    }

    moveThreatTowardPlayer(entity, player);

    if (distance > CLAN_THREAT_SPECIAL_ATTACK_RANGE || currentTick < threat.nextAttackTick) {
      continue;
    }

    applySpecialThreatDamage(entity, player);
    threat.nextAttackTick = currentTick + CLAN_THREAT_SPECIAL_ATTACK_COOLDOWN_TICKS;
  }
}
