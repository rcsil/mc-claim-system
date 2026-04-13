import { system } from "@minecraft/server";

import { MESSAGE_COOLDOWN_TICKS } from "../config.js";
import { getWarningTick, setWarningTick } from "../state/clanStore.js";
import { getPlayerName, sendPlayerMessage } from "../utils/player.js";

export function sendRateLimitedMessage(player, key, message) {
  const playerName = getPlayerName(player) ?? player.id;
  const throttleKey = `${playerName}:${key}`;
  const lastTick = getWarningTick(throttleKey) ?? -MESSAGE_COOLDOWN_TICKS;

  if (system.currentTick - lastTick < MESSAGE_COOLDOWN_TICKS) {
    return;
  }

  setWarningTick(throttleKey, system.currentTick);
  system.run(() => {
    sendPlayerMessage(player, message);
  });
}
