import { system } from "@minecraft/server";

import { CLAN_INVITE_TTL_TICKS } from "../config.js";
import { clearPendingInvite, getClanByName, getClanByPlayer, getPendingInvite, getPendingInviteEntries, saveClans, setPendingInvite, upsertClan } from "../state/clanStore.js";
import { findOnlinePlayerByName, getPlayerName, sendPlayerMessage } from "../utils/player.js";

function isClanOwner(playerName, clan) {
  return clan.ownerName === playerName;
}

function hasBannedMember(clan, playerName) {
  return clan.bannedMembers.includes(playerName);
}

export function invitePlayerToClan(player, rawTargetName) {
  const inviterName = getPlayerName(player);
  if (!inviterName) {
    return { ok: false, message: "Nao foi possivel identificar o jogador." };
  }

  const clan = getClanByPlayer(inviterName);
  if (!clan) {
    return { ok: false, message: "Voce nao faz parte de um clan." };
  }

  if (!isClanOwner(inviterName, clan)) {
    return { ok: false, message: "Apenas o dono do clan pode convidar jogadores." };
  }

  const targetPlayer = findOnlinePlayerByName(rawTargetName);
  const targetName = getPlayerName(targetPlayer);
  if (!targetPlayer || !targetName) {
    return { ok: false, message: "Jogador nao encontrado online." };
  }

  if (targetName === inviterName) {
    return { ok: false, message: "Voce nao pode convidar a si mesmo." };
  }

  if (getClanByPlayer(targetName)) {
    return { ok: false, message: `${targetName} ja faz parte de um clan.` };
  }

  if (hasBannedMember(clan, targetName)) {
    return { ok: false, message: `${targetName} esta banido do clan ${clan.name}.` };
  }

  setPendingInvite(targetName, {
    clanName: clan.name,
    invitedBy: inviterName,
    expirationTick: system.currentTick + CLAN_INVITE_TTL_TICKS,
  });

  sendPlayerMessage(targetPlayer, `${inviterName} convidou voce para o clan ${clan.name}. Use !clan aceitar.`);
  return { ok: true, message: `Convite enviado para ${targetName}.` };
}

export function acceptClanInvite(player) {
  const playerName = getPlayerName(player);
  if (!playerName) {
    return { ok: false, message: "Nao foi possivel identificar o jogador." };
  }

  if (getClanByPlayer(playerName)) {
    clearPendingInvite(playerName);
    return { ok: false, message: "Voce ja faz parte de um clan." };
  }

  const invite = getPendingInvite(playerName);
  if (!invite) {
    return { ok: false, message: "Voce nao possui convite pendente." };
  }

  if (system.currentTick > invite.expirationTick) {
    clearPendingInvite(playerName);
    return { ok: false, message: "Seu convite expirou." };
  }

  const targetClan = getClanByName(invite.clanName);
  if (!targetClan) {
    clearPendingInvite(playerName);
    return { ok: false, message: "O clan do convite nao esta mais disponivel." };
  }

  if (targetClan.bannedMembers.includes(playerName)) {
    clearPendingInvite(playerName);
    return { ok: false, message: `Voce foi banido do clan ${targetClan.name}.` };
  }

  targetClan.members.push(playerName);
  upsertClan(targetClan);

  if (!saveClans()) {
    targetClan.members = targetClan.members.filter((member) => member !== playerName);
    upsertClan(targetClan);
    return { ok: false, message: "Nao foi possivel entrar no clan. Tente novamente." };
  }

  clearPendingInvite(playerName);
  return { ok: true, clan: targetClan };
}

export function cleanupExpiredInvites() {
  for (const [playerName, invite] of getPendingInviteEntries()) {
    if (system.currentTick > invite.expirationTick) {
      clearPendingInvite(playerName);
    }
  }
}
