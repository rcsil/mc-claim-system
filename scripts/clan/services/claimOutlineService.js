import { system, world } from "@minecraft/server";

import {
  CLAN_CLAIM_OUTLINE_DURATION_TICKS,
  CLAN_CLAIM_OUTLINE_INTERVAL_TICKS,
  CLAN_CLAIM_OUTLINE_MAX_DISTANCE,
  CLAN_CLAIM_OUTLINE_MAX_PARTICLES,
  CLAN_CLAIM_OUTLINE_PARTICLE_ID,
  CLAN_CLAIM_OUTLINE_Y_OFFSET,
} from "../config.js";
import { getClaimBounds, normalizeClaim } from "../utils/claim.js";
import { runSafely } from "../utils/runtime.js";

const activeClaimOutlines = new Map();
let outlineTickScheduled = false;

function getClaimOutlineKey(claim) {
  return `${claim.dimensionId}:${claim.x}:${claim.y}:${claim.z}:${claim.size}`;
}

function getHorizontalDistanceToClaim(location, claim) {
  const bounds = getClaimBounds(claim);
  const x = location.x;
  const z = location.z;
  const maxX = bounds.maxX + 1;
  const maxZ = bounds.maxZ + 1;
  const dx = x < bounds.minX ? bounds.minX - x : x > maxX ? x - maxX : 0;
  const dz = z < bounds.minZ ? bounds.minZ - z : z > maxZ ? z - maxZ : 0;

  return Math.sqrt(dx * dx + dz * dz);
}

function forEachClaimPerimeterPosition(claim, callback) {
  const bounds = getClaimBounds(claim);
  const width = bounds.maxX - bounds.minX + 1;
  const depth = bounds.maxZ - bounds.minZ + 1;
  const perimeterBlocks = Math.max(1, width * 2 + depth * 2 - 4);
  const step = Math.max(1, Math.ceil(perimeterBlocks / CLAN_CLAIM_OUTLINE_MAX_PARTICLES));
  const y = claim.y + CLAN_CLAIM_OUTLINE_Y_OFFSET;
  let index = 0;

  const maybeEmit = (x, z) => {
    if (index % step === 0) {
      callback({ x: x + 0.5, y, z: z + 0.5 });
    }
    index += 1;
  };

  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    maybeEmit(x, bounds.minZ);
    if (bounds.maxZ !== bounds.minZ) {
      maybeEmit(x, bounds.maxZ);
    }
  }

  for (let z = bounds.minZ + 1; z <= bounds.maxZ - 1; z += 1) {
    maybeEmit(bounds.minX, z);
    if (bounds.maxX !== bounds.minX) {
      maybeEmit(bounds.maxX, z);
    }
  }
}

function renderClaimOutline(claim) {
  const dimension = runSafely("renderClaimOutline.getDimension", () => world.getDimension(claim.dimensionId));
  if (!dimension) {
    return false;
  }

  return runSafely("renderClaimOutline.spawnParticles", () => {
    forEachClaimPerimeterPosition(claim, (location) => {
      dimension.spawnParticle(CLAN_CLAIM_OUTLINE_PARTICLE_ID, location);
    });
    return true;
  }) === true;
}

function scheduleActiveClaimOutlines() {
  if (outlineTickScheduled || activeClaimOutlines.size === 0) {
    return;
  }

  outlineTickScheduled = true;
  system.runTimeout(renderActiveClaimOutlines, CLAN_CLAIM_OUTLINE_INTERVAL_TICKS);
}

function renderActiveClaimOutlines() {
  outlineTickScheduled = false;
  const currentTick = system.currentTick;

  for (const [key, outline] of activeClaimOutlines.entries()) {
    if (currentTick > outline.expiresAtTick) {
      activeClaimOutlines.delete(key);
      continue;
    }

    renderClaimOutline(outline.claim);
  }

  scheduleActiveClaimOutlines();
}

export function showClaimOutline(claim, durationTicks = CLAN_CLAIM_OUTLINE_DURATION_TICKS) {
  const normalizedClaim = normalizeClaim(claim);
  if (!normalizedClaim) {
    return false;
  }

  const key = getClaimOutlineKey(normalizedClaim);
  activeClaimOutlines.set(key, {
    claim: normalizedClaim,
    expiresAtTick: system.currentTick + durationTicks,
  });

  renderClaimOutline(normalizedClaim);
  scheduleActiveClaimOutlines();
  return true;
}

export function isClaimNearPlayer(player, claim, maxDistance = CLAN_CLAIM_OUTLINE_MAX_DISTANCE) {
  const normalizedClaim = normalizeClaim(claim);
  if (!normalizedClaim || player?.dimension?.id !== normalizedClaim.dimensionId || !player.location) {
    return false;
  }

  return getHorizontalDistanceToClaim(player.location, normalizedClaim) <= maxDistance;
}

export function showClaimOutlineIfNearPlayer(player, claim) {
  if (!isClaimNearPlayer(player, claim)) {
    return false;
  }

  return showClaimOutline(claim);
}
