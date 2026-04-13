import { world } from "@minecraft/server";

import { CLAN_DATA_PROPERTY, CLAN_INVITES_PROPERTY } from "../config.js";
import { normalizeClaim } from "../utils/claim.js";
import { getPlayerName } from "../utils/player.js";
import { logError, runSafely } from "../utils/runtime.js";

const clansByName = new Map();
const clanNameByMember = new Map();
const pendingInvitesByPlayer = new Map();
const pendingPlacementsByPlayer = new Map();
const genericMarkersByPlayer = new Set();
const warningTicksByKey = new Map();

function getClanStorageKey(clanName) {
  return clanName.toLowerCase();
}

export function createClanRecord(name, ownerName, members, options = {}) {
  const bannedMembers = Array.isArray(options.bannedMembers) ? options.bannedMembers : [];

  return {
    name,
    ownerName,
    members: [...members],
    bannedMembers: [...bannedMembers],
    claim: normalizeClaim(options.claim),
  };
}

function rebuildClanIndexes() {
  clanNameByMember.clear();

  for (const clan of clansByName.values()) {
    for (const memberName of clan.members) {
      clanNameByMember.set(memberName, clan.name);
    }
  }
}

export function loadClans() {
  clansByName.clear();
  clanNameByMember.clear();

  const rawClans = world.getDynamicProperty(CLAN_DATA_PROPERTY);
  if (typeof rawClans !== "string" || rawClans.length === 0) {
    return;
  }

  let parsedClans;
  try {
    parsedClans = JSON.parse(rawClans);
  } catch (error) {
    logError("loadClans.parse", error);
    return;
  }

  if (!Array.isArray(parsedClans)) {
    return;
  }

  for (const clan of parsedClans) {
    if (
      !clan ||
      typeof clan.name !== "string" ||
      typeof clan.ownerName !== "string" ||
      !Array.isArray(clan.members)
    ) {
      continue;
    }

    const members = clan.members.filter((member) => typeof member === "string" && member.length > 0);
    if (!members.includes(clan.ownerName)) {
      members.unshift(clan.ownerName);
    }

    const bannedMembers = Array.isArray(clan.bannedMembers)
      ? clan.bannedMembers.filter((member) => typeof member === "string" && member.length > 0)
      : [];

    const normalizedClan = createClanRecord(clan.name, clan.ownerName, members, {
      bannedMembers,
      claim: clan.claim,
    });

    clansByName.set(getClanStorageKey(normalizedClan.name), normalizedClan);
  }

  rebuildClanIndexes();
}

export function saveClans() {
  return runSafely("saveClans", () => {
    world.setDynamicProperty(CLAN_DATA_PROPERTY, JSON.stringify([...clansByName.values()]));
    return true;
  }) === true;
}

export function getAllClans() {
  return [...clansByName.values()];
}

export function getClanByName(clanName) {
  if (!clanName) {
    return undefined;
  }

  return clansByName.get(getClanStorageKey(clanName));
}

export function getClanByPlayer(playerOrName) {
  const playerName = typeof playerOrName === "string" ? playerOrName : getPlayerName(playerOrName);
  if (!playerName) {
    return undefined;
  }

  const clanName = clanNameByMember.get(playerName);
  return clanName ? getClanByName(clanName) : undefined;
}

export function upsertClan(clan) {
  clansByName.set(getClanStorageKey(clan.name), clan);
  rebuildClanIndexes();
}

export function deleteClan(clanName) {
  clansByName.delete(getClanStorageKey(clanName));
  rebuildClanIndexes();
}

export function loadInvites() {
  pendingInvitesByPlayer.clear();

  const rawInvites = world.getDynamicProperty(CLAN_INVITES_PROPERTY);
  if (typeof rawInvites !== "string" || rawInvites.length === 0) {
    return;
  }

  let parsedInvites;
  try {
    parsedInvites = JSON.parse(rawInvites);
  } catch (error) {
    logError("loadInvites.parse", error);
    return;
  }

  if (!Array.isArray(parsedInvites)) {
    return;
  }

  for (const entry of parsedInvites) {
    if (entry && typeof entry.playerName === "string" && entry.invite) {
      pendingInvitesByPlayer.set(entry.playerName, entry.invite);
    }
  }
}

export function saveInvites() {
  return runSafely("saveInvites", () => {
    const invitesData = Array.from(pendingInvitesByPlayer.entries()).map(([playerName, invite]) => ({
      playerName,
      invite,
    }));
    world.setDynamicProperty(CLAN_INVITES_PROPERTY, JSON.stringify(invitesData));
    return true;
  }) === true;
}

export function setPendingInvite(playerName, invite) {
  pendingInvitesByPlayer.set(playerName, invite);
  saveInvites();
}

export function getPendingInvite(playerName) {
  return pendingInvitesByPlayer.get(playerName);
}

export function clearPendingInvite(playerName) {
  pendingInvitesByPlayer.delete(playerName);
  saveInvites();
}

export function getPendingInviteEntries() {
  return pendingInvitesByPlayer.entries();
}

export function setPendingPlacement(playerName, placement) {
  pendingPlacementsByPlayer.set(playerName, placement);
}

export function getPendingPlacement(playerName) {
  return pendingPlacementsByPlayer.get(playerName);
}

export function clearPendingPlacement(playerName) {
  pendingPlacementsByPlayer.delete(playerName);
}

export function getPendingPlacementEntries() {
  return pendingPlacementsByPlayer.entries();
}

export function addGenericMarkerOwner(playerName) {
  genericMarkersByPlayer.add(playerName);
}

export function deleteGenericMarkerOwner(playerName) {
  genericMarkersByPlayer.delete(playerName);
}

export function hasGenericMarkerOwner(playerName) {
  return genericMarkersByPlayer.has(playerName);
}

export function getWarningTick(key) {
  return warningTicksByKey.get(key);
}

export function setWarningTick(key, tick) {
  warningTicksByKey.set(key, tick);
}
