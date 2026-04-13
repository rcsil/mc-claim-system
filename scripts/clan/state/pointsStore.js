import { world } from "@minecraft/server";

import { CLAN_POINTS_LEADERBOARD_LIMIT, CLAN_POINTS_PROPERTY } from "../config.js";
import { getAllClans } from "./clanStore.js";
import { getPlayerName } from "../utils/player.js";
import { logError, runSafely } from "../utils/runtime.js";

const pointsByPlayerKey = new Map();

function getPlayerKey(playerName) {
  return typeof playerName === "string" ? playerName.trim().toLowerCase() : "";
}

function normalizePoints(value) {
  const points = Number(value);
  if (!Number.isFinite(points)) {
    return 0;
  }

  return Math.max(0, Math.floor(points));
}

function getEntry(playerOrName) {
  const playerName = typeof playerOrName === "string" ? playerOrName : getPlayerName(playerOrName);
  const key = getPlayerKey(playerName);
  if (!key) {
    return undefined;
  }

  return pointsByPlayerKey.get(key) ?? { playerName: playerName.trim(), points: 0 };
}

export function loadPlayerPoints() {
  pointsByPlayerKey.clear();

  const rawPoints = world.getDynamicProperty(CLAN_POINTS_PROPERTY);
  if (typeof rawPoints !== "string" || rawPoints.length === 0) {
    return;
  }

  let parsedPoints;
  try {
    parsedPoints = JSON.parse(rawPoints);
  } catch (error) {
    logError("loadPlayerPoints.parse", error);
    return;
  }

  const entries = Array.isArray(parsedPoints)
    ? parsedPoints
    : Object.entries(parsedPoints).map(([playerName, points]) => ({ playerName, points }));

  for (const entry of entries) {
    if (!entry || typeof entry.playerName !== "string") {
      continue;
    }

    const key = getPlayerKey(entry.playerName);
    const points = normalizePoints(entry.points);
    if (!key || points <= 0) {
      continue;
    }

    pointsByPlayerKey.set(key, {
      playerName: entry.playerName.trim(),
      points,
    });
  }
}

export function savePlayerPoints() {
  return runSafely("savePlayerPoints", () => {
    world.setDynamicProperty(CLAN_POINTS_PROPERTY, JSON.stringify([...pointsByPlayerKey.values()]));
    return true;
  }) === true;
}

export function getPlayerPoints(playerOrName) {
  return getEntry(playerOrName)?.points ?? 0;
}

export function setPlayerPoints(playerOrName, points) {
  const entry = getEntry(playerOrName);
  if (!entry) {
    return false;
  }

  const normalizedPoints = normalizePoints(points);
  const key = getPlayerKey(entry.playerName);
  const previousEntry = pointsByPlayerKey.get(key);
  if (normalizedPoints <= 0) {
    pointsByPlayerKey.delete(key);
  } else {
    pointsByPlayerKey.set(key, {
      playerName: entry.playerName,
      points: normalizedPoints,
    });
  }

  if (savePlayerPoints()) {
    return true;
  }

  if (previousEntry) {
    pointsByPlayerKey.set(key, previousEntry);
  } else {
    pointsByPlayerKey.delete(key);
  }

  return false;
}

export function addPlayerPoints(playerOrName, delta) {
  const entry = getEntry(playerOrName);
  if (!entry) {
    return { ok: false, previousPoints: 0, points: 0, delta: 0 };
  }

  const previousPoints = entry.points;
  const nextPoints = normalizePoints(previousPoints + Number(delta));
  const saved = setPlayerPoints(entry.playerName, nextPoints);

  return {
    ok: saved,
    previousPoints,
    points: saved ? nextPoints : previousPoints,
    delta: saved ? nextPoints - previousPoints : 0,
  };
}

export function getTopPlayers(limit = CLAN_POINTS_LEADERBOARD_LIMIT) {
  return [...pointsByPlayerKey.values()]
    .filter((entry) => entry.points > 0)
    .sort((left, right) => right.points - left.points || left.playerName.localeCompare(right.playerName))
    .slice(0, limit);
}

export function getClanPoints(clan) {
  if (!clan || !Array.isArray(clan.members)) {
    return 0;
  }

  return clan.members.reduce((total, memberName) => total + getPlayerPoints(memberName), 0);
}

export function getTopClans(limit = CLAN_POINTS_LEADERBOARD_LIMIT) {
  return getAllClans()
    .map((clan) => ({
      clan,
      points: getClanPoints(clan),
    }))
    .filter((entry) => entry.points > 0)
    .sort((left, right) => right.points - left.points || left.clan.name.localeCompare(right.clan.name))
    .slice(0, limit);
}
