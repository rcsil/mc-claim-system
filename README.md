# mc-claim-system
Clan system for Minecraft Bedrock

## Commands

The behavior pack registers the custom slash command `/clan:clan`.

Minecraft Bedrock creates a shortcut from the command name after the namespace. Because of that, `/clan:clan create <name>` can also be used as `/clan create <name>` when no other command already owns the `/clan` alias.

Use `/clan` or `/clan info` to show your clan coordinates. If you are close to the claim, flame particles are displayed around the protected area.

Use `/clan top` to show the top 5 players and top 5 clans by points. Use `/clan points` to show your own points and your clan total.

Point rules:

- Killing a non-player entity gives 1 point.
- Killing a player gives 5 points.
- Dying removes 5 points, but a player cannot go below 0.
- Clan points are calculated as the sum of the current members' points.

For worlds with cheats disabled, the command registration must include:

- `permissionLevel: CustomCommandPermissionLevel.Any`
- `cheatsRequired: false`

Chat fallback is also supported with `!clan`.
