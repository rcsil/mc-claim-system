import { CLAN_MARKER_ITEM_ID, CLAN_MARKER_LORE_KEY, CLAN_MARKER_NAME } from "../config.js";
import { createItemStack } from "./player.js";
import { runSafely } from "./runtime.js";

export function getItemLore(itemStack) {
  if (!itemStack) {
    return [];
  }

  return runSafely("getItemLore", () => itemStack.getLore()) ?? [];
}

export function isClanMarkerItem(itemStack) {
  if (!itemStack || itemStack.typeId !== CLAN_MARKER_ITEM_ID || itemStack.nameTag !== CLAN_MARKER_NAME) {
    return false;
  }

  const lore = getItemLore(itemStack);
  return lore.length === 0 || lore.includes(CLAN_MARKER_LORE_KEY);
}

export function createClanMarkerItem(clanName) {
  return runSafely("createClanMarkerItem", () => {
    const marker = createItemStack(CLAN_MARKER_ITEM_ID, 1);
    if (!marker) {
      throw new Error(`Nao foi possivel criar ${CLAN_MARKER_ITEM_ID}`);
    }

    marker.nameTag = CLAN_MARKER_NAME;

    runSafely("createClanMarkerItem.setLore", () => {
      marker.setLore([
        CLAN_MARKER_LORE_KEY,
        `Clan: ${clanName}`,
        "Place on the ground to create the 10x10 clan area.",
      ]);
    });

    runSafely("createClanMarkerItem.keepOnDeath", () => {
      marker.keepOnDeath = true;
    });

    return marker;
  });
}
