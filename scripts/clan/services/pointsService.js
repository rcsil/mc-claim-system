import {
  CLAN_ENTITY_KILL_POINTS,
  CLAN_PLAYER_DEATH_POINTS_LOSS,
  CLAN_PLAYER_KILL_POINTS,
} from "../config.js";
import { addPlayerPoints } from "../state/pointsStore.js";
import { getPlayerName, isPlayerEntity } from "../utils/player.js";
import { runSafely } from "../utils/runtime.js";
import { updatePointsLeaderboardScoreboard } from "./pointsLeaderboardService.js";

const NON_SCORING_ENTITY_TYPES = new Set([
  "minecraft:armor_stand",
  "minecraft:item",
  "minecraft:item_frame",
  "minecraft:glow_item_frame",
  "minecraft:xp_orb",
]);

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

function isScoringEntityKill(entity) {
  return Boolean(entity?.typeId) && !NON_SCORING_ENTITY_TYPES.has(entity.typeId);
}

function areSamePlayer(leftName, rightName) {
  return typeof leftName === "string"
    && typeof rightName === "string"
    && leftName.toLowerCase() === rightName.toLowerCase();
}

export function handleEntityDeathPoints(event) {
  return runSafely("handleEntityDeathPoints", () => {
    const deadEntity = event.deadEntity ?? event.entity;
    if (!deadEntity) {
      return false;
    }

    let pointsChanged = false;
    const deadEntityIsPlayer = isPlayerEntity(deadEntity);
    const deadPlayerName = deadEntityIsPlayer ? getPlayerName(deadEntity) : undefined;

    if (deadPlayerName) {
      const loss = addPlayerPoints(deadPlayerName, -CLAN_PLAYER_DEATH_POINTS_LOSS);
      pointsChanged = pointsChanged || loss.delta !== 0;
    }

    const killer = getDamageSourcePlayer(event.damageSource);
    const killerName = getPlayerName(killer);
    if (!killerName || areSamePlayer(killerName, deadPlayerName)) {
      if (pointsChanged) {
        updatePointsLeaderboardScoreboard();
      }
      return pointsChanged;
    }

    if (deadEntityIsPlayer) {
      const gain = addPlayerPoints(killerName, CLAN_PLAYER_KILL_POINTS);
      pointsChanged = pointsChanged || gain.delta !== 0;
    } else if (isScoringEntityKill(deadEntity)) {
      const gain = addPlayerPoints(killerName, CLAN_ENTITY_KILL_POINTS);
      pointsChanged = pointsChanged || gain.delta !== 0;
    }

    if (pointsChanged) {
      updatePointsLeaderboardScoreboard();
    }

    return pointsChanged;
  }) === true;
}
