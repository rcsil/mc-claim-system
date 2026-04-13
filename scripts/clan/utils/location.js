import { Direction } from "@minecraft/server";

export function normalizeLocation(location) {
  return {
    x: Math.floor(location.x),
    y: Math.floor(location.y),
    z: Math.floor(location.z),
  };
}

export function normalizeDirection(direction) {
  if (direction === Direction.Up || direction === "up" || direction === "Up") {
    return "up";
  }

  if (direction === Direction.Down || direction === "down" || direction === "Down") {
    return "down";
  }

  if (direction === Direction.East || direction === "east" || direction === "East") {
    return "east";
  }

  if (direction === Direction.West || direction === "west" || direction === "West") {
    return "west";
  }

  if (direction === Direction.North || direction === "north" || direction === "North") {
    return "north";
  }

  if (direction === Direction.South || direction === "south" || direction === "South") {
    return "south";
  }

  return undefined;
}

export function offsetLocation(location, direction) {
  const next = { x: location.x, y: location.y, z: location.z };

  switch (normalizeDirection(direction)) {
    case "up":
      next.y += 1;
      break;
    case "down":
      next.y -= 1;
      break;
    case "east":
      next.x += 1;
      break;
    case "west":
      next.x -= 1;
      break;
    case "north":
      next.z -= 1;
      break;
    case "south":
      next.z += 1;
      break;
    default:
      break;
  }

  return next;
}

export function areSameLocation(left, right) {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

export function getEventDimensionId(event) {
  return event.dimension?.id ?? event.player?.dimension?.id ?? event.source?.dimension?.id;
}

export function getUseOnFace(event) {
  return event.blockFace ?? event.face;
}
