import { CLAN_START_SIZE } from "../config.js";

export function getClaimBounds(claim) {
  const lowerSpan = Math.floor((claim.size - 1) / 2);
  const upperSpan = claim.size - lowerSpan - 1;

  return {
    minX: claim.x - lowerSpan,
    maxX: claim.x + upperSpan,
    minZ: claim.z - lowerSpan,
    maxZ: claim.z + upperSpan,
  };
}

export function isLocationInsideClaim(claim, dimensionId, location) {
  if (!claim || claim.dimensionId !== dimensionId) {
    return false;
  }

  const bounds = getClaimBounds(claim);
  return location.x >= bounds.minX && location.x <= bounds.maxX && location.z >= bounds.minZ && location.z <= bounds.maxZ;
}

export function claimsOverlap(leftClaim, rightClaim) {
  if (!leftClaim || !rightClaim || leftClaim.dimensionId !== rightClaim.dimensionId) {
    return false;
  }

  const leftBounds = getClaimBounds(leftClaim);
  const rightBounds = getClaimBounds(rightClaim);

  return (
    leftBounds.minX <= rightBounds.maxX &&
    leftBounds.maxX >= rightBounds.minX &&
    leftBounds.minZ <= rightBounds.maxZ &&
    leftBounds.maxZ >= rightBounds.minZ
  );
}

export function formatClaimSize(claim) {
  return `${claim.size}x${claim.size}`;
}

export function formatClaimCoordinates(claim) {
  return `${claim.x}, ${claim.y}, ${claim.z}`;
}

export function normalizeClaim(claim) {
  if (!claim) {
    return undefined;
  }

  return {
    dimensionId: claim.dimensionId,
    x: Math.floor(claim.x),
    y: Math.floor(claim.y),
    z: Math.floor(claim.z),
    size: Math.max(CLAN_START_SIZE, Math.floor(claim.size)),
  };
}
