import { z } from "zod";

export const ClientMessage = {
  MOVE: "input:move",
  ATTACK: "input:attack",
  INTERACT: "input:interact",
  USE_ITEM: "input:use_item",
} as const;

export const ServerMessage = {
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
});

export type MoveInput = z.infer<typeof MoveInputSchema>;
export type AttackInput = z.infer<typeof AttackInputSchema>;
export type InteractInput = z.infer<typeof InteractInputSchema>;
export type JoinZoneOptions = z.infer<typeof JoinZoneOptionsSchema>;
