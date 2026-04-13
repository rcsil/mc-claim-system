import { banClanMember } from "../services/banClanService.js";
import { createClan } from "../services/createClanService.js";
import { invitePlayerToClan, acceptClanInvite } from "../services/inviteClanService.js";
import { leaveClan } from "../services/leaveClanService.js";
import { canRequestClanMarker, giveClanMarker } from "../services/markerInventoryService.js";
import { upgradeClanClaim } from "../services/upgradeClanService.js";
import { showClaimOutlineIfNearPlayer } from "../services/claimOutlineService.js";
import { parseCommand } from "../utils/command.js";
import { formatClaimCoordinates, formatClaimSize } from "../utils/claim.js";
import { sendPlayerMessage } from "../utils/player.js";
import { getClanByPlayer } from "../state/clanStore.js";

function showClanHelp(player) {
  sendPlayerMessage(
    player,
    "Commands: /clan <action>, /clan:clan <action>, or !clan <action>. Actions: create <name>, invite <player>, accept, leave, ban <player>, upgrade, flag, info, help.",
  );
}

function showClanInfo(player) {
  const clan = getClanByPlayer(player);
  if (!clan) {
    sendPlayerMessage(player, "You are not part of a clan.");
    return;
  }

  const members = clan.members.join(", ");
  const bannedMembers = clan.bannedMembers.length > 0 ? clan.bannedMembers.join(", ") : "none";
  if (!clan.claim) {
    sendPlayerMessage(
      player,
      `Clan ${clan.name}. Owner: ${clan.ownerName}. Members: ${members}. Banned: ${bannedMembers}. Area not yet created.`,
    );
    return;
  }

  const outlineShown = showClaimOutlineIfNearPlayer(player, clan.claim);
  const outlineMessage = outlineShown
    ? " Foquinhos exibidos no limite da area."
    : " Aproxime-se da area para ver os foquinhos.";

  sendPlayerMessage(
    player,
    `Clan ${clan.name}. Owner: ${clan.ownerName}. Members: ${members}. Banned: ${bannedMembers}. Area ${formatClaimSize(clan.claim)} in ${clan.claim.dimensionId} at coordinates ${formatClaimCoordinates(clan.claim)}.${outlineMessage}`,
  );
}

function handleCreateClan(player, rawClanName) {
  if (!rawClanName) {
    sendPlayerMessage(player, "Usage: /clan create <name> or !clan create <name>.");
    return;
  }

  const creation = createClan(player, rawClanName);
  if (!creation.ok) {
    sendPlayerMessage(player, creation.message);
    return;
  }

  sendPlayerMessage(
    player,
    `Clan ${creation.clan.name} created. You received the flag to mark the 10x10 area on the ground.`,
  );
}

function handleInvite(player, rawTargetName) {
  const result = invitePlayerToClan(player, rawTargetName);
  sendPlayerMessage(player, result.message);
}

function handleAccept(player) {
  const result = acceptClanInvite(player);
  if (!result.ok) {
    sendPlayerMessage(player, result.message);
    return;
  }

  sendPlayerMessage(player, `You joined the clan ${result.clan.name}.`);
}

function handleLeave(player) {
  const result = leaveClan(player);
  sendPlayerMessage(player, result.message);
}

function handleBan(player, rawTargetName) {
  const result = banClanMember(player, rawTargetName);
  sendPlayerMessage(player, result.message);
}

function handleUpgrade(player) {
  const result = upgradeClanClaim(player);
  if (!result.ok) {
    sendPlayerMessage(player, result.message);
    return;
  }

  sendPlayerMessage(
    player,
    `The area of clan ${result.clan.name} is now ${formatClaimSize(result.clan.claim)}.`,
  );
  showClaimOutlineIfNearPlayer(player, result.clan.claim);
}

function handleMarker(player) {
  const result = canRequestClanMarker(player);
  if (!result.ok) {
    sendPlayerMessage(player, result.message);
    return;
  }

  if (!giveClanMarker(player, result.clan.name)) {
    sendPlayerMessage(player, "Could not give the clan flag.");
    return;
  }

  sendPlayerMessage(
    player,
    `You received the flag of clan ${result.clan.name}. Place it on the ground to mark the 10x10 area.`,
  );
}

export function executeClanCommand(player, message) {
  const parsed = parseCommand(message);
  if (!parsed || parsed.root !== "clan") {
    return false;
  }

  switch (parsed.action) {
    case "":
      showClanInfo(player);
      return true;
    case "help":
      showClanHelp(player);
      return true;
    case "create":
      handleCreateClan(player, parsed.args[0]);
      return true;
    case "invite":
      handleInvite(player, parsed.args[0]);
      return true;
    case "accept":
      handleAccept(player);
      return true;
    case "leave":
      handleLeave(player);
      return true;
    case "ban":
      handleBan(player, parsed.args[0]);
      return true;
    case "upgrade":
      handleUpgrade(player);
      return true;
    case "flag":
      handleMarker(player);
      return true;
    case "info":
      showClanInfo(player);
      return true;
    default:
      sendPlayerMessage(player, "Unknown command. Use /clan help or !clan help.");
      return true;
  }
}
