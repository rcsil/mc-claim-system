import { INTERACTIVE_BLOCK_IDS, PROTECTED_ENTITY_TYPES } from "../config.js";
import { findForeignClanAtLocation } from "../services/clanQueries.js";
import { sendRateLimitedMessage } from "../services/notifications.js";
import { normalizeLocation } from "../utils/location.js";
import { isPlayerEntity } from "../utils/player.js";
import { runSafely } from "../utils/runtime.js";

function hasProtectedBlockInventory(block) {
  const inventoryComponent = runSafely("hasProtectedBlockInventory", () => block.getComponent("minecraft:inventory"));
  return Boolean(inventoryComponent?.container);
}

function isProtectedInteractiveBlock(block) {
  return INTERACTIVE_BLOCK_IDS.has(block.typeId) || hasProtectedBlockInventory(block);
}

function isProtectedEntity(target) {
  if (PROTECTED_ENTITY_TYPES.has(target.typeId)) {
    return true;
  }

  const inventoryComponent = runSafely("isProtectedEntity.inventory", () => target.getComponent("minecraft:inventory"));
  return Boolean(inventoryComponent?.container);
}

export function protectBreak(event) {
  const foreignClan = findForeignClanAtLocation(event.player, event.player.dimension.id, normalizeLocation(event.block.location));
  if (!foreignClan) {
    return;
  }

  event.cancel = true;
  sendRateLimitedMessage(event.player, "break", `Voce nao pode quebrar blocos na area do clan ${foreignClan.name}.`);
}

export function protectPlace(event) {
  const foreignClan = findForeignClanAtLocation(event.player, event.player.dimension.id, normalizeLocation(event.block.location));
  if (!foreignClan) {
    return;
  }

  event.cancel = true;
  sendRateLimitedMessage(event.player, "place", `Voce nao pode construir na area do clan ${foreignClan.name}.`);
}

export function protectBlockInteraction(event) {
  const foreignClan = findForeignClanAtLocation(event.player, event.player.dimension.id, normalizeLocation(event.block.location));
  if (!foreignClan || !isProtectedInteractiveBlock(event.block)) {
    return;
  }

  event.cancel = true;
  sendRateLimitedMessage(event.player, "blockInteract", `Voce nao pode usar blocos na area do clan ${foreignClan.name}.`);
}

export function protectEntityInteraction(event) {
  if (isPlayerEntity(event.target)) {
    return;
  }

  const foreignClan = findForeignClanAtLocation(
    event.player,
    event.player.dimension.id,
    normalizeLocation(event.target.location),
  );

  if (!foreignClan || !isProtectedEntity(event.target)) {
    return;
  }

  event.cancel = true;
  sendRateLimitedMessage(event.player, "entityInteract", `Voce nao pode usar entidades na area do clan ${foreignClan.name}.`);
}
