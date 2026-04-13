export const CLAN_START_SIZE = 10;
export const CLAN_UPGRADE_COST = 5;
export const CLAN_UPGRADE_ITEM_ID = "minecraft:netherite_ingot";
export const CLAN_UPGRADE_SIZE_DELTA = 2;
export const CLAN_DATA_PROPERTY = "clan:data";
export const CLAN_INVITES_PROPERTY = "clan:invites";
export const CLAN_MARKER_ITEM_ID = "minecraft:banner";
export const CLAN_MARKER_NAME = "Clan Flag";
export const CLAN_MARKER_LORE_KEY = "clan.marker";
export const CLAN_PENDING_TTL_TICKS = 10;
export const CLAN_INVITE_TTL_TICKS = 20 * 60 * 5;
export const MESSAGE_COOLDOWN_TICKS = 20;
export const DEBUG_PREFIX = "[clan]";

export const INTERACTIVE_BLOCK_IDS = new Set([
  "minecraft:crafting_table",
  "minecraft:smithing_table",
  "minecraft:cartography_table",
  "minecraft:grindstone",
  "minecraft:loom",
  "minecraft:stonecutter_block",
  "minecraft:enchanting_table",
  "minecraft:anvil",
  "minecraft:chipped_anvil",
  "minecraft:damaged_anvil",
  "minecraft:brewing_stand",
  "minecraft:furnace",
  "minecraft:blast_furnace",
  "minecraft:smoker",
  "minecraft:campfire",
  "minecraft:soul_campfire",
  "minecraft:undyed_shulker_box",
]);

export const PROTECTED_ENTITY_TYPES = new Set([
  "minecraft:item_frame",
  "minecraft:glow_item_frame",
  "minecraft:glow_frame",
  "minecraft:armor_stand",
  "minecraft:chest_minecart",
  "minecraft:hopper_minecart",
  "minecraft:furnace_minecart",
]);
