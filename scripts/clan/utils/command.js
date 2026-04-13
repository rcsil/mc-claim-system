export function parseCommand(message) {
  const trimmed = message.trim();
  if (!trimmed.startsWith("!") && !trimmed.startsWith("/")) {
    return undefined;
  }

  const withoutPrefix = trimmed.slice(1).trim();
  if (withoutPrefix.length === 0) {
    return undefined;
  }

  const parts = withoutPrefix.split(/\s+/);
  const root = (parts[0] ?? "").toLowerCase();
  let action = (parts[1] ?? "").toLowerCase();
  let args = parts.slice(2);

  // Support for /clan create<name> without space
  if (root === "clan" && action.startsWith("create") && action.length > 6) {
    args = [parts[1].substring(6), ...args];
    action = "create";
  }

  return {
    root,
    action,
    args,
  };
}

export function isClanCommandMessage(message) {
  return parseCommand(message)?.root === "clan";
}
