import { deleteClan, getClanByPlayer, saveClans, upsertClan } from "../state/clanStore.js";
import { getPlayerName } from "../utils/player.js";

export function leaveClan(player) {
  const playerName = getPlayerName(player);
  if (!playerName) {
    return { ok: false, message: "Nao foi possivel identificar o jogador." };
  }

  const clan = getClanByPlayer(playerName);
  if (!clan) {
    return { ok: false, message: "Voce nao faz parte de um clan." };
  }

  const previousMembers = [...clan.members];
  const previousOwner = clan.ownerName;

  if (clan.ownerName !== playerName) {
    clan.members = clan.members.filter((member) => member !== playerName);
    upsertClan(clan);

    if (!saveClans()) {
      clan.members = previousMembers;
      upsertClan(clan);
      return { ok: false, message: "Nao foi possivel sair do clan. Tente novamente." };
    }

    return { ok: true, message: `Voce saiu do clan ${clan.name}.` };
  }

  const remainingMembers = clan.members.filter((member) => member !== playerName);
  if (remainingMembers.length === 0) {
    deleteClan(clan.name);

    if (!saveClans()) {
      upsertClan(clan);
      return { ok: false, message: "Nao foi possivel encerrar o clan. Tente novamente." };
    }

    return { ok: true, message: `Voce saiu do clan ${clan.name} e ele foi encerrado.` };
  }

  clan.members = remainingMembers;
  clan.ownerName = remainingMembers[0];
  upsertClan(clan);

  if (!saveClans()) {
    clan.members = previousMembers;
    clan.ownerName = previousOwner;
    upsertClan(clan);
    return { ok: false, message: "Nao foi possivel sair do clan. Tente novamente." };
  }

  return {
    ok: true,
    message: `Voce saiu do clan ${clan.name}. Novo dono: ${clan.ownerName}.`,
  };
}
