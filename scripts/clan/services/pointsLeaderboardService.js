import { world } from "@minecraft/server";
import * as mc from "@minecraft/server";

import {
  CLAN_POINTS_LEADERBOARD_LIMIT,
  CLAN_POINTS_SCOREBOARD_DISPLAY_NAME,
  CLAN_POINTS_SCOREBOARD_OBJECTIVE_ID,
} from "../config.js";
import { getTopClans, getTopPlayers } from "../state/pointsStore.js";
import { runSafely } from "../utils/runtime.js";

function getDisplaySlotId() {
  return mc.DisplaySlotId?.Sidebar ?? mc.ScoreboardDisplaySlotId?.Sidebar ?? "Sidebar";
}

function getDescendingSortOrder() {
  return mc.ObjectiveSortOrder?.Descending ?? 1;
}

function getScoreboardObjective() {
  const scoreboard = world.scoreboard;
  if (!scoreboard) {
    return undefined;
  }

  return runSafely("getScoreboardObjective", () => {
    return scoreboard.getObjective(CLAN_POINTS_SCOREBOARD_OBJECTIVE_ID)
      ?? scoreboard.addObjective(CLAN_POINTS_SCOREBOARD_OBJECTIVE_ID, CLAN_POINTS_SCOREBOARD_DISPLAY_NAME);
  });
}

function clearObjectiveParticipants(objective) {
  const participants = runSafely("clearObjectiveParticipants.getParticipants", () => objective.getParticipants()) ?? [];
  for (const participant of participants) {
    runSafely("clearObjectiveParticipants.removeParticipant", () => {
      objective.removeParticipant(participant);
    });
  }
}

function truncateLabel(label) {
  return label.length > 32 ? `${label.slice(0, 29)}...` : label;
}

function setLeaderboardScore(objective, label, points) {
  runSafely(`setLeaderboardScore.${label}`, () => {
    objective.setScore(truncateLabel(label), points);
  });
}

export function updatePointsLeaderboardScoreboard() {
  const scoreboard = world.scoreboard;
  const objective = getScoreboardObjective();
  if (!scoreboard || !objective) {
    return false;
  }

  return runSafely("updatePointsLeaderboardScoreboard", () => {
    clearObjectiveParticipants(objective);

    const topPlayers = getTopPlayers(CLAN_POINTS_LEADERBOARD_LIMIT);
    const topClans = getTopClans(CLAN_POINTS_LEADERBOARD_LIMIT);

    topPlayers.forEach((entry, index) => {
      setLeaderboardScore(objective, `P${index + 1} ${entry.playerName}`, entry.points);
    });

    topClans.forEach((entry, index) => {
      setLeaderboardScore(objective, `C${index + 1} ${entry.clan.name}`, entry.points);
    });

    scoreboard.setObjectiveAtDisplaySlot(getDisplaySlotId(), {
      objective,
      sortOrder: getDescendingSortOrder(),
    });

    return true;
  }) === true;
}

function formatTopPlayers() {
  const topPlayers = getTopPlayers(CLAN_POINTS_LEADERBOARD_LIMIT);
  if (topPlayers.length === 0) {
    return "Top players: none.";
  }

  return `Top players: ${topPlayers
    .map((entry, index) => `${index + 1}. ${entry.playerName} (${entry.points})`)
    .join(", ")}.`;
}

function formatTopClans() {
  const topClans = getTopClans(CLAN_POINTS_LEADERBOARD_LIMIT);
  if (topClans.length === 0) {
    return "Top clans: none.";
  }

  return `Top clans: ${topClans
    .map((entry, index) => `${index + 1}. ${entry.clan.name} (${entry.points})`)
    .join(", ")}.`;
}

export function getPointsLeaderboardMessages() {
  return [formatTopPlayers(), formatTopClans()];
}
