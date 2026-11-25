import { BACKPACK_SLOTS } from "@pawlands/shared";
import { z } from "zod";

export const ClientMessage = {
  CHARACTER_SHEET: "input:character_sheet",
  MOVE: "input:move",
  ATTACK: "input:attack",
  INTERACT: "input:interact",
  EQUIP_ITEM: "input:equip_item",
  USE_ITEM: "input:use_item",
} as const;

export const ServerMessage = {
  CHARACTER_SHEET: "character:sheet",
  COMBAT_HIT: "combat:hit",
  SYSTEM_NOTICE: "system:notice",
  ZONE_TRANSFER: "zone:transfer",
} as const;

export const CharacterArchetypeSchema = z.enum(["tomcat", "cat", "kitten"]);

export const ZoneIdSchema = z.enum([
  "oakpaw_village",
  "whispering_woods",
  "clawpeak_ridge",
  "sunken_crypt",
  "bloodclaw_wilds",
]);

export const MoveInputSchema = z.object({
  dx: z.number().min(-1).max(1),
  dy: z.number().min(-1).max(1),
  sprint: z.boolean().default(false),
  seq: z.number().int().nonnegative(),
});

export const AttackInputSchema = z.object({
  aimX: z.number().finite(),
  aimY: z.number().finite(),
  targetId: z.string().min(1).max(64).optional(),
});

export const InteractInputSchema = z.object({
  targetId: z.string().min(1).max(64),
});

export const JoinZoneOptionsSchema = z.object({
  zoneId: ZoneIdSchema.default("oakpaw_village"),
  name: z.string().trim().min(2).max(24).default("Whisker"),
  archetype: CharacterArchetypeSchema.default("cat"),
  token: z.string().min(1).optional(),
});

export type MoveInput = z.infer<typeof MoveInputSchema>;
export type AttackInput = z.infer<typeof AttackInputSchema>;
export type InteractInput = z.infer<typeof InteractInputSchema>;
export type JoinZoneOptions = z.infer<typeof JoinZoneOptionsSchema>;

export const CharacterSheetRequestSchema = z.object({}).strict();

export const BackpackActionSchema = z.object({ slot: z.number().int().nonnegative().max(BACKPACK_SLOTS - 1) });

export const CharacterSheetSchema = z.object({
  level: z.number().int().positive(),
  xp: z.number().nonnegative(),
  coins: z.number().int().nonnegative(),
  strength: z.number().int().nonnegative(),
  agility: z.number().int().nonnegative(),
  attackPower: z.number().nonnegative(),
  defense: z.number().nonnegative(),
  backpack: z.array(z.object({
    itemId: z.string(),
    quantity: z.number().int().positive(),
    equipped: z.boolean(),
  }).nullable()).length(BACKPACK_SLOTS),
});

export type CharacterSheet = z.infer<typeof CharacterSheetSchema>;
