import { describe, expect, it } from "vitest";
import {
  AdminUpdateUserRequestSchema,
  AdminUpdateZoneRequestSchema,
  AdminUsersQuerySchema,
} from "./admin.js";

describe("admin protocol schemas", () => {
  it("parses user query defaults and filters", () => {
    const defaults = AdminUsersQuerySchema.parse({});
    expect(defaults).toEqual({
      limit: 25,
      offset: 0,
    });

    const filtered = AdminUsersQuerySchema.parse({
      search: "  whisker ",
      role: "moderator",
      bannedOnly: "true",
      limit: "10",
      offset: "5",
    });
    expect(filtered).toEqual({
      search: "whisker",
      role: "moderator",
      bannedOnly: true,
      limit: 10,
      offset: 5,
    });
  });

  it("requires at least one field for user and zone updates", () => {
    expect(AdminUpdateUserRequestSchema.safeParse({}).success).toBe(false);
    expect(AdminUpdateUserRequestSchema.safeParse({ role: "admin" }).success).toBe(true);
    expect(
      AdminUpdateUserRequestSchema.safeParse({ isBanned: true, banReason: "Spamming" }).success
    ).toBe(true);

    expect(AdminUpdateZoneRequestSchema.safeParse({}).success).toBe(false);
    expect(AdminUpdateZoneRequestSchema.safeParse({ isPvpEnabled: true }).success).toBe(true);
    expect(
      AdminUpdateZoneRequestSchema.safeParse({ spawnX: -10, spawnY: 100 }).success
    ).toBe(false);
  });
});
