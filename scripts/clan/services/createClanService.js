import { CLAN_START_SIZE } from "../config.js";
import { createClanRecord, deleteClan, getClanByName, getClanByPlayer, saveClans, upsertClan } from "../state/clanStore.js";
import { findOverlapForClaim, isValidClanName, normalizeClanNameInput } from "./clanQueries.js";
import { giveClanMarker } from "./markerInventoryService.js";
import { getPlayerName } from "../utils/player.js";

export function createClan(player, rawClanName) {
  const ownerName = getPlayerName(player);
  if (!ownerName) {
    return { ok: false, message: "Could not identify the player." };
  }

  if (getClanByPlayer(ownerName)) {
    return { ok: false, message: "You are already part of a clan." };
  }

  const clanName = normalizeClanNameInput(rawClanName);
  if (!isValidClanName(clanName)) {
    return {
      ok: false,
      message: "Use a name between 3 and 16 characters with letters, numbers, _ or -.",
    };
  }

  if (getClanByName(clanName)) {
    return { ok: false, message: `There is already a clan named ${clanName}.` };
  }

  const clan = createClanRecord(clanName, ownerName, [ownerName]);
  upsertClan(clan);

  if (!saveClans()) {
    deleteClan(clan.name);
    return { ok: false, message: "Could not save the clan. Try again." };
  }

  if (!giveClanMarker(player, clan.name)) {
    deleteClan(clan.name);
    saveClans();
    return { ok: false, message: "Could not give the flag, so the clan was not saved." };
  }

  return { ok: true, clan };
}

export function createClanClaim(player, markerLocation) {
  const clan = getClanByPlayer(player);
  if (!clan) {
    return { ok: false, message: "You need to be part of a clan before using the flag." };
  }

  if (clan.claim) {
    return { ok: false, message: "Your clan already has a marked area." };
  }

  const claim = {
    dimensionId: player.dimension.id,
    x: markerLocation.x,
    y: markerLocation.y,
    z: markerLocation.z,
    size: CLAN_START_SIZE,
  };

  const overlap = findOverlapForClaim(clan.name, claim);
  if (overlap) {
    return { ok: false, message: `This area touches the area of clan ${overlap.name}.` };
  }

  clan.claim = claim;
  upsertClan(clan);

  if (!saveClans()) {
    clan.claim = undefined;
    upsertClan(clan);
    return { ok: false, message: "Could not save the clan area." };
  }

  return { ok: true, clan };
}