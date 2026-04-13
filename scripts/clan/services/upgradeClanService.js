import { CLAN_UPGRADE_COST, CLAN_UPGRADE_ITEM_ID, CLAN_UPGRADE_SIZE_DELTA } from "../config.js";
import { getClanByPlayer, saveClans, upsertClan } from "../state/clanStore.js";
import { countItem, consumeItem, createItemStack, getPlayerInventory, getPlayerName } from "../utils/player.js";
import { findOverlapForClaim } from "./clanQueries.js";

export function upgradeClanClaim(player) {
  const clan = getClanByPlayer(player);
  if (!clan) {
    return { ok: false, message: "Voce nao faz parte de um clan." };
  }

  if (clan.ownerName !== getPlayerName(player)) {
    return { ok: false, message: "Apenas o dono do clan pode aumentar a area." };
  }

  if (!clan.claim) {
    return { ok: false, message: "Seu clan ainda nao possui area. Use a bandeira primeiro." };
  }

  const inventory = getPlayerInventory(player);
  if (!inventory) {
    return { ok: false, message: "Nao foi possivel acessar seu inventario." };
  }

  const ingots = countItem(inventory, CLAN_UPGRADE_ITEM_ID);
  if (ingots < CLAN_UPGRADE_COST) {
    return {
      ok: false,
      message: `Voce precisa de ${CLAN_UPGRADE_COST} barras de netherite para usar !clan upgrade.`,
    };
  }

  const upgradedClaim = {
    ...clan.claim,
    size: clan.claim.size + CLAN_UPGRADE_SIZE_DELTA,
  };

  const overlap = findOverlapForClaim(clan.name, upgradedClaim);
  if (overlap) {
    return { ok: false, message: `Nao foi possivel aumentar a area porque encostaria no clan ${overlap.name}.` };
  }

  if (!consumeItem(inventory, CLAN_UPGRADE_ITEM_ID, CLAN_UPGRADE_COST)) {
    return { ok: false, message: "Nao foi possivel consumir as barras de netherite." };
  }

  const previousClaim = { ...clan.claim };
  clan.claim = upgradedClaim;
  upsertClan(clan);

  if (!saveClans()) {
    clan.claim = previousClaim;
    upsertClan(clan);

    const refundStack = createItemStack(CLAN_UPGRADE_ITEM_ID, CLAN_UPGRADE_COST);
    const refundedItems = refundStack ? inventory.addItem(refundStack) : undefined;
    if (refundedItems) {
      player.dimension.spawnItem(refundedItems, player.location);
    }

    return { ok: false, message: "Nao foi possivel salvar o upgrade da area. Seus itens foram devolvidos." };
  }

  return { ok: true, clan };
}
