import { clearPendingInvite, getClanByPlayer, saveClans, upsertClan } from "../state/clanStore.js";
import { findOnlinePlayerByName, getPlayerName, sendPlayerMessage } from "../utils/player.js";

export function banClanMember(player, rawTargetName) {
  const playerName = getPlayerName(player);
  if (!playerName) {
    return { ok: false, message: "Nao foi possivel identificar o jogador." };
  }

  const clan = getClanByPlayer(playerName);
  if (!clan) {
    return { ok: false, message: "Voce nao faz parte de um clan." };
  }

  if (clan.ownerName !== playerName) {
    return { ok: false, message: "Apenas o dono do clan pode banir membros." };
  }

  const targetName = rawTargetName?.trim();
  if (!targetName) {
    return { ok: false, message: "Use !clan banir <jogador>." };
  }

  if (targetName.toLowerCase() === playerName.toLowerCase()) {
    return { ok: false, message: "Voce nao pode banir a si mesmo." };
  }

  const memberName = clan.members.find((member) => member.toLowerCase() === targetName.toLowerCase());
  if (!memberName) {
    return { ok: false, message: `${targetName} nao faz parte do seu clan.` };
  }

  clan.members = clan.members.filter((member) => member !== memberName);
  if (!clan.bannedMembers.includes(memberName)) {
    clan.bannedMembers.push(memberName);
  }

  upsertClan(clan);
  if (!saveClans()) {
    clan.members.push(memberName);
    clan.bannedMembers = clan.bannedMembers.filter((member) => member !== memberName);
    upsertClan(clan);
    return { ok: false, message: "Nao foi possivel banir o jogador. Tente novamente." };
  }

  clearPendingInvite(memberName);
  const onlinePlayer = findOnlinePlayerByName(memberName);
  if (onlinePlayer) {
    sendPlayerMessage(onlinePlayer, `Voce foi banido do clan ${clan.name}.`);
  }

  return { ok: true, message: `${memberName} foi banido do clan ${clan.name}.` };
}
