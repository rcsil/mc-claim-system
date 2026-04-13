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

Threat rules:

- From 0 to 24 points, extra monsters can spawn near the player based on player level: level x 3, limited to 15 mobs.
- From 25 to 30 points, infestation-level monster waves can spawn.
- Above 30 points, infestation continues and special threats can randomly spawn.

For worlds with cheats disabled, the command registration must include:

- `permissionLevel: CustomCommandPermissionLevel.Any`
- `cheatsRequired: false`

Chat fallback is also supported with `!clan`.
