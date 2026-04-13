import { system, world } from "@minecraft/server";
import * as mc from "@minecraft/server";

import { CLAN_PENDING_TTL_TICKS, CLAN_POINTS_SCOREBOARD_REFRESH_TICKS } from "./config.js";
import { executeClanCommand } from "./commands/clanCommands.js";
import { protectBlockInteraction, protectBreak, protectEntityInteraction, protectPlace } from "./events/protectionEvents.js";
import { cleanupExpiredInvites } from "./services/inviteClanService.js";
import { cleanupPendingClanPlacements, handleClanMarkerPlacement, trackClanMarkerUse } from "./services/markerPlacementService.js";
import { handleEntityDeathPoints } from "./services/pointsService.js";
import { updatePointsLeaderboardScoreboard } from "./services/pointsLeaderboardService.js";
import { loadClans, loadInvites } from "./state/clanStore.js";
import { loadPlayerPoints } from "./state/pointsStore.js";
import { isClanCommandMessage } from "./utils/command.js";
import { sendPlayerMessage } from "./utils/player.js";
import { subscribeIfAvailable, runSafely } from "./utils/runtime.js";

const CLAN_COMMAND_ACTION_ENUM = "clan:action";
const CLAN_COMMAND_ACTIONS = ["help", "create", "invite", "accept", "leave", "ban", "upgrade", "flag", "info", "top", "ranking", "points", "score"];

function getCustomCommandStatus() {
  return mc.CustomCommandStatus || { Success: 0, Failure: 1 };
}

function getSlashCommandPlayer(origin) {
  return origin?.sourceEntity ?? origin?.entity;
}

function createCustomCommandResult(status, message) {
  return message ? { status, message } : { status };
}

function scheduleClanCommand(player, action = "", args = []) {
  system.run(() => {
    const normalizedArgs = [];
    if (Array.isArray(args)) {
      for (const value of args) {
        if (Array.isArray(value)) {
          for (const nestedValue of value) {
            if (typeof nestedValue === "string" && nestedValue.trim().length > 0) {
              normalizedArgs.push(nestedValue.trim());
            }
          }
          continue;
        }

        if (typeof value === "string" && value.trim().length > 0) {
          normalizedArgs.push(value.trim());
        }
      }
    }

    const commandParts = ["!clan"];
    if (typeof action === "string" && action.trim().length > 0) {
      commandParts.push(action.trim());
    }
    commandParts.push(...normalizedArgs);
    executeClanCommand(player, commandParts.join(" ").trim());
  });
}

function registerChatCommands() {
  const beforeChat = world.beforeEvents.chatSend;
  const registeredBeforeChat = subscribeIfAvailable("subscribe.chatSend.before", beforeChat, (event) => {
    const message = event.message.trim();
    if (!isClanCommandMessage(message)) {
      return;
    }

    event.cancel = true;
    system.run(() => {
      executeClanCommand(event.sender, message);
    });
  });

  if (registeredBeforeChat) {
    return;
  }

  subscribeIfAvailable("subscribe.chatSend.after", world.afterEvents.chatSend, (event) => {
    const message = event.message.trim();
    if (!isClanCommandMessage(message)) {
      return;
    }

    system.run(() => {
      executeClanCommand(event.sender, message);
    });
  });
}

function registerClanMarkerTracking() {
  const callbacks = [
    {
      scope: "subscribe.itemUseOn.before",
      signal: world.beforeEvents.itemUseOn,
      runScope: "itemUseOn.before",
    },
    {
      scope: "subscribe.itemUseOn.after",
      signal: world.afterEvents.itemUseOn,
      runScope: "itemUseOn.after",
    },
    {
      scope: "subscribe.itemStartUseOn.after",
      signal: world.afterEvents.itemStartUseOn,
      runScope: "itemStartUseOn.after",
    },
  ];

  for (const callbackConfig of callbacks) {
    subscribeIfAvailable(callbackConfig.scope, callbackConfig.signal, (event) => {
      runSafely(callbackConfig.runScope, () => {
        trackClanMarkerUse(event);
      });
    });
  }
}

function clanCustomCommand(origin, ...args) {
  const CustomCommandStatus = getCustomCommandStatus();
  const player = getSlashCommandPlayer(origin);
  if (!player || player.typeId !== "minecraft:player") {
    return createCustomCommandResult(CustomCommandStatus.Failure, "This command can only be used by a player.");
  }

  scheduleClanCommand(player, "", args);
  return createCustomCommandResult(CustomCommandStatus.Success);
}

function registerCustomSlashCommands() {
  if (!system.beforeEvents || !system.beforeEvents.startup) {
    return;
  }

  subscribeIfAvailable("subscribe.startup", system.beforeEvents.startup, (init) => {
    if (!init.customCommandRegistry) return;

    // Fallback definitions for the API since the stable Bedrock version
    // does not export these enums consistently despite what the docs say.
    const CustomCommandPermissionLevel = mc.CustomCommandPermissionLevel || mc.CommandPermissionLevel || { Any: 1, Admin: 2 };
    const CustomCommandParamType = mc.CustomCommandParamType || mc.CommandParamType || {};
    const stringParamType = CustomCommandParamType.String ?? 8;
    const enumParamType = CustomCommandParamType.Enum;
    const commandRegistry = init.customCommandRegistry;
    const hasEnumParamType = typeof enumParamType === "number" || typeof enumParamType === "string";
    const registerClanCommand = (definition, handler) => {
      commandRegistry.registerCommand(
        {
          permissionLevel: CustomCommandPermissionLevel.Any,
          cheatsRequired: false,
          ...definition,
        },
        handler,
      );
    };
    const actionParameter =
      hasEnumParamType
        ? (() => {
            commandRegistry.registerEnum(CLAN_COMMAND_ACTION_ENUM, CLAN_COMMAND_ACTIONS);
            return { type: enumParamType, name: CLAN_COMMAND_ACTION_ENUM };
          })()
        : { type: stringParamType, name: "action" };

    registerClanCommand({
      name: "clan:clan",
      description: "Clan system commands.",
      optionalParameters: [
        actionParameter,
        { type: stringParamType, name: "argument" }
      ]
    }, clanCustomCommand);
  });
}

export function initializeClanManager() {
  system.run(() => {
    runSafely("startup", loadClans);
    runSafely("startupInvites", loadInvites);
    runSafely("startupPoints", loadPlayerPoints);
    runSafely("startupPointsLeaderboard", updatePointsLeaderboardScoreboard);
  });

  system.runInterval(() => {
    runSafely("cleanupPendingClanPlacements", cleanupPendingClanPlacements);
    runSafely("cleanupExpiredInvites", cleanupExpiredInvites);
  }, CLAN_PENDING_TTL_TICKS);

  system.runInterval(() => {
    runSafely("refreshPointsLeaderboard", updatePointsLeaderboardScoreboard);
  }, CLAN_POINTS_SCOREBOARD_REFRESH_TICKS);

  subscribeIfAvailable("subscribe.playerSpawn", world.afterEvents.playerSpawn, (event) => {
    system.run(() => {
      sendPlayerMessage(event.player, "Use /clan create <name>, /clan:clan create <name> or !clan create <name> to create your clan and receive the flag.");
    });
  });

  registerChatCommands();
  registerCustomSlashCommands();
  registerClanMarkerTracking();

  subscribeIfAvailable("subscribe.entityDie.after", world.afterEvents.entityDie, (event) => {
    handleEntityDeathPoints(event);
  });

  subscribeIfAvailable("subscribe.playerPlaceBlock.after", world.afterEvents.playerPlaceBlock, (event) => {
    runSafely("playerPlaceBlock.after", () => {
      handleClanMarkerPlacement(event);
    });
  });

  subscribeIfAvailable("subscribe.playerBreakBlock.before", world.beforeEvents.playerBreakBlock, (event) => {
    protectBreak(event);
  });

  subscribeIfAvailable("subscribe.playerPlaceBlock.before", world.beforeEvents.playerPlaceBlock, (event) => {
    protectPlace(event);
  });

  subscribeIfAvailable("subscribe.playerInteractWithBlock.before", world.beforeEvents.playerInteractWithBlock, (event) => {
    protectBlockInteraction(event);
  });

  subscribeIfAvailable("subscribe.playerInteractWithEntity.before", world.beforeEvents.playerInteractWithEntity, (event) => {
    protectEntityInteraction(event);
  });
}

initializeClanManager();
