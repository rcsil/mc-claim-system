import { getAllClans, getClanByPlayer } from "../state/clanStore.js";
import { claimsOverlap, isLocationInsideClaim } from "../utils/claim.js";

export function normalizeClanNameInput(rawName) {
  return rawName.trim();
}

export function isValidClanName(clanName) {
  return /^[A-Za-z0-9_-]{3,16}$/.test(clanName);
}

export function isClanOwner(playerOrName, clan) {
  const playerName = typeof playerOrName === "string" ? playerOrName : playerOrName?.name ?? playerOrName?.nameTag;
  return Boolean(clan && playerName && clan.ownerName === playerName);
}

export function findClanClaimAtLocation(dimensionId, location) {
  for (const clan of getAllClans()) {
    if (isLocationInsideClaim(clan.claim, dimensionId, location)) {
      return clan;
    }
  }

  return undefined;
}

export function findForeignClanAtLocation(player, dimensionId, location) {
  const clanAtLocation = findClanClaimAtLocation(dimensionId, location);
  if (!clanAtLocation) {
    return undefined;
  }

  const playerClan = getClanByPlayer(player);
  if (playerClan && playerClan.name === clanAtLocation.name) {
    return undefined;
  }

  return clanAtLocation;
}

export function findOverlapForClaim(clanName, candidateClaim) {
  for (const clan of getAllClans()) {
    if (clan.name === clanName || !clan.claim) {
      continue;
    }

    if (claimsOverlap(candidateClaim, clan.claim)) {
      return clan;
    }
  }

  return undefined;
}
