# mc-claim-system
Clan system for Minecraft Bedrock

## Commands

The behavior pack registers the custom slash command `/clan:clan`.

Minecraft Bedrock creates a shortcut from the command name after the namespace. Because of that, `/clan:clan create <name>` can also be used as `/clan create <name>` when no other command already owns the `/clan` alias.

For worlds with cheats disabled, the command registration must include:

- `permissionLevel: CustomCommandPermissionLevel.Any`
- `cheatsRequired: false`

Chat fallback is also supported with `!clan`.
