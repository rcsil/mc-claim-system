import { CLAN_MARKER_ITEM_ID } from "../config.js";
import { getClanByPlayer } from "../state/clanStore.js";
import { addGenericMarkerOwner, deleteGenericMarkerOwner, hasGenericMarkerOwner } from "../state/clanStore.js";
import { createClanMarkerItem, isClanMarkerItem } from "../utils/item.js";
import { createItemStack, getPlayerInventory, getPlayerName } from "../utils/player.js";
import { runSafely } from "../utils/runtime.js";

export function hasClanMarker(player) {
  const playerName = getPlayerName(player);
  if (playerName && hasGenericMarkerOwner(playerName)) {
    return true;
  }

  const inventory = getPlayerInventory(player);
  if (!inventory) {
    return false;
  }

  for (let slot = 0; slot < inventory.size; slot += 1) {
    const item = inventory.getItem(slot);
    if (isClanMarkerItem(item)) {
      return true;
    }
  }

  return false;
}

function giveGenericClanMarker(player) {
  const playerName = getPlayerName(player);
  if (!playerName) {
    return false;
  }

  const marker = createItemStack(CLAN_MARKER_ITEM_ID, 1);
  if (!marker) {
    return false;
  }

  const inventory = getPlayerInventory(player);
  if (!inventory) {
    runSafely("giveGenericClanMarker.noInventory", () => {
      player.dimension.spawnItem(marker, player.location);
    });
    addGenericMarkerOwner(playerName);
    return true;
  }

  for (let slot = 0; slot < inventory.size; slot += 1) {
    if (!inventory.getItem(slot)) {
      inventory.setItem(slot, marker);
      addGenericMarkerOwner(playerName);
      return true;
    }
  }

  const leftover = inventory.addItem(marker);
  if (leftover) {
    runSafely("giveGenericClanMarker.spawnLeftover", () => {
      player.dimension.spawnItem(leftover, player.location);
    });
  }

  addGenericMarkerOwner(playerName);
  return true;
}

export function giveClanMarker(player, clanName) {
  const inventory = getPlayerInventory(player);
  const marker = createClanMarkerItem(clanName);
  if (!marker) {
    return giveGenericClanMarker(player);
  }

  const playerName = getPlayerName(player);
  if (playerName) {
    deleteGenericMarkerOwner(playerName);
  }

  if (!inventory) {
    runSafely("giveClanMarker.noInventory", () => {
      player.dimension.spawnItem(marker, player.location);
    });
    return true;
  }

  for (let slot = 0; slot < inventory.size; slot += 1) {
    if (!inventory.getItem(slot)) {
      inventory.setItem(slot, marker);
      return true;
    }
  }

  const leftover = inventory.addItem(marker);
  if (leftover) {
    runSafely("giveClanMarker.spawnLeftover", () => {
      player.dimension.spawnItem(leftover, player.location);
    });
  }

  return true;
}

export function canRequestClanMarker(player) {
  const clan = getClanByPlayer(player);
  const playerName = getPlayerName(player);

  if (!clan) {
    return { ok: false, message: "You are not part of a clan yet." };
  }

  if (clan.ownerName !== playerName) {
    return { ok: false, message: "Only the clan owner can request the flag." };
  }

  if (clan.claim) {
    return { ok: false, message: "Your clan already has a marked area." };
  }

  if (hasClanMarker(player)) {
    return { ok: false, message: "You already have the clan flag in your inventory." };
  }

  return { ok: true, clan };
}
