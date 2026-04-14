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
export const CLAN_CLAIM_OUTLINE_PARTICLE_ID = "minecraft:basic_flame_particle";
export const CLAN_CLAIM_OUTLINE_DURATION_TICKS = 20 * 8;
export const CLAN_CLAIM_OUTLINE_INTERVAL_TICKS = 10;
export const CLAN_CLAIM_OUTLINE_MAX_DISTANCE = 64;
export const CLAN_CLAIM_OUTLINE_MAX_PARTICLES = 160;
export const CLAN_CLAIM_OUTLINE_Y_OFFSET = 0.15;
export const CLAN_POINTS_PROPERTY = "clan:points";
export const CLAN_ENTITY_KILL_POINTS = 1;
export const CLAN_PLAYER_KILL_POINTS = 5;
export const CLAN_PLAYER_DEATH_POINTS_LOSS = 5;
export const CLAN_POINTS_LEADERBOARD_LIMIT = 5;
export const CLAN_POINTS_SCOREBOARD_OBJECTIVE_ID = "clan_points_top";
export const CLAN_POINTS_SCOREBOARD_DISPLAY_NAME = "Clan Points";
export const CLAN_POINTS_SCOREBOARD_REFRESH_TICKS = 20 * 10;
export const CLAN_THREAT_SPAWN_INTERVAL_TICKS = 20 * 25;
export const CLAN_THREAT_SPECIAL_UPDATE_INTERVAL_TICKS = 20;
export const CLAN_THREAT_MIN_DISTANCE = 12;
export const CLAN_THREAT_MAX_DISTANCE = 24;
export const CLAN_THREAT_DESPAWN_DISTANCE = 72;
export const CLAN_THREAT_SPAWN_ATTEMPTS = 16;
export const CLAN_THREAT_MAX_ACTIVE_NEAR_PLAYER = 18;
export const CLAN_THREAT_INFESTATION_MIN_POINTS = 25;
export const CLAN_THREAT_SPECIAL_MIN_POINTS = 31;
export const CLAN_THREAT_LEVEL_SPAWN_MULTIPLIER = 3;
export const CLAN_THREAT_LEVEL_SPAWN_LIMIT = 15;
export const CLAN_THREAT_INFESTATION_SPAWN_COUNT = 6;
export const CLAN_THREAT_SPECIAL_SPAWN_CHANCE = 0.25;
export const CLAN_THREAT_SPECIAL_ATTACK_DAMAGE = 8;
export const CLAN_THREAT_SPECIAL_ATTACK_RANGE = 4.5;
export const CLAN_THREAT_SPECIAL_ATTACK_COOLDOWN_TICKS = 20 * 2;
export const CLAN_THREAT_CREAKING_HEALTH = 100;
export const CLAN_THREAT_TAG = "clan_point_threat";
export const CLAN_THREAT_SPECIAL_TAG = "clan_special_threat";
export const CLAN_THREAT_COMMON_ENTITY_TYPES = ["minecraft:zombie", "minecraft:skeleton", "minecraft:spider"];
export const CLAN_THREAT_INFESTATION_ENTITY_TYPES = ["minecraft:zombie", "minecraft:skeleton", "minecraft:spider", "minecraft:silverfish", "minecraft:endermite"];
export const CLAN_THREAT_SPECIAL_ENTITY_TYPES = ["minecraft:vindicator", "minecraft:iron_golem", "minecraft:wither", "minecraft:creaking"];
export const CLAN_RECALL_CLOCK_ITEM_ID = "clan:recall_clock";
export const CLAN_RECALL_CLOCK_NAME = "Relogio de Retorno do Clan";
export const CLAN_RECALL_CLOCK_LORE_KEY = "clan.recall_clock";
export const CLAN_RECALL_CLOCK_ID_PROPERTY = "clan:recall_clock_id";
export const CLAN_RECALL_CLOCKS_PROPERTY = "clan:recall_clocks";
export const CLAN_RECALL_CLOCK_MAX_ACTIVE = 5;
export const CLAN_RECALL_CLOCK_DROP_CHANCE = 0.021;
export const CLAN_RECALL_CLOCK_SCAN_INTERVAL_TICKS = 20 * 30;
export const CLAN_RECALL_CLOCK_USE_COOLDOWN_TICKS = 20 * 5;

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
