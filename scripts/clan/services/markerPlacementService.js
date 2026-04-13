import { system } from "@minecraft/server";

import { CLAN_MARKER_ITEM_ID, CLAN_PENDING_TTL_TICKS } from "../config.js";
import { clearPendingPlacement, deleteGenericMarkerOwner, getClanByPlayer, getPendingPlacement, getPendingPlacementEntries, hasGenericMarkerOwner, setPendingPlacement } from "../state/clanStore.js";
import { createClanClaim } from "./createClanService.js";
import { giveClanMarker } from "./markerInventoryService.js";
import { areSameLocation, getEventDimensionId, getUseOnFace, normalizeDirection, normalizeLocation, offsetLocation } from "../utils/location.js";
import { isClanMarkerItem } from "../utils/item.js";
import { getPlayerName, sendPlayerMessage } from "../utils/player.js";
import { formatClaimSize } from "../utils/claim.js";
import { runSafely } from "../utils/runtime.js";

function revertPlacedClanMarker(block, player, message) {
  runSafely("revertPlacedClanMarker", () => {
    block.setType("minecraft:air");
  });

  const clan = getClanByPlayer(player);
  if (clan) {
    giveClanMarker(player, clan.name);
  }

  sendPlayerMessage(player, message);
}

export function trackClanMarkerUse(event) {
  const player = event.source ?? event.player;
  const block = event.block;
  const blockFace = getUseOnFace(event);
  const itemStack = event.itemStack ?? event.item;
  const playerName = getPlayerName(player);
  const dimensionId = getEventDimensionId(event);

  const isMarkerItem = isClanMarkerItem(itemStack) || (
    playerName &&
    hasGenericMarkerOwner(playerName) &&
    itemStack?.typeId === CLAN_MARKER_ITEM_ID
  );

  if (!playerName || !dimensionId || !block || blockFace == null || !isMarkerItem) {
    return;
  }

  setPendingPlacement(playerName, {
    tick: system.currentTick,
    dimensionId,
    expectedLocation: offsetLocation(normalizeLocation(block.location), blockFace),
    onGround: normalizeDirection(blockFace) === "up",
  });
}

export function cleanupPendingClanPlacements() {
  for (const [playerName, pendingPlacement] of getPendingPlacementEntries()) {
    if (system.currentTick - pendingPlacement.tick > CLAN_PENDING_TTL_TICKS) {
      clearPendingPlacement(playerName);
    }
  }
}

export function handleClanMarkerPlacement(event) {
  const playerName = getPlayerName(event.player);
  if (!playerName) {
    return;
  }

  const pendingPlacement = getPendingPlacement(playerName);
  if (!pendingPlacement) {
    return;
  }

  if (system.currentTick - pendingPlacement.tick > CLAN_PENDING_TTL_TICKS) {
    clearPendingPlacement(playerName);
    return;
  }

  const dimensionId = getEventDimensionId(event);
  if (!dimensionId || dimensionId !== pendingPlacement.dimensionId) {
    return;
  }

  const placedLocation = normalizeLocation(event.block.location);
  if (!areSameLocation(placedLocation, pendingPlacement.expectedLocation)) {
    return;
  }

  clearPendingPlacement(playerName);

  if (!pendingPlacement.onGround) {
    revertPlacedClanMarker(event.block, event.player, "Coloque a bandeira no chao para marcar a area do clan.");
    return;
  }

  const clan = getClanByPlayer(event.player);
  if (!clan || clan.ownerName !== playerName) {
    revertPlacedClanMarker(event.block, event.player, "Apenas o dono do clan pode marcar a area.");
    return;
  }

  const creation = createClanClaim(event.player, placedLocation);
  if (!creation.ok) {
    revertPlacedClanMarker(event.block, event.player, creation.message);
    return;
  }

  deleteGenericMarkerOwner(playerName);

  sendPlayerMessage(
    event.player,
    `Area do clan ${creation.clan.name} criada com sucesso em ${formatClaimSize(creation.clan.claim)}.`,
  );
}
