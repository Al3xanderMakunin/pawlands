import { describe, expect, it } from "vitest";
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  TelegramAuthRequestSchema,
} from "./auth.js";

describe("auth protocol schemas", () => {
  it("normalizes and validates a registration payload", () => {
    const parsed = RegisterRequestSchema.parse({
      email: "  Whisker@Pawlands.GG ",
      username: "Whisker_01",
      password: "super-secret-password",
    });

    expect(parsed).toEqual({
      email: "whisker@pawlands.gg",
      username: "Whisker_01",
      password: "super-secret-password",
    });
  });

  it("rejects invalid usernames and short passwords", () => {
    const invalidUsername = RegisterRequestSchema.safeParse({
      email: "cat@pawlands.gg",
      username: "bad name!",
      password: "validpassword123",
    });
    expect(invalidUsername.success).toBe(false);

    const shortPassword = RegisterRequestSchema.safeParse({
      email: "cat@pawlands.gg",
      username: "ValidCat",
      password: "123",
    });
    expect(shortPassword.success).toBe(false);
  });

  it("validates login payload with email or username identifier", () => {
    expect(
      LoginRequestSchema.safeParse({
        identifier: "Whisker_01",
        password: "secret",
      }).success
    ).toBe(true);

    expect(
      LoginRequestSchema.safeParse({
        identifier: "ab",
        password: "secret",
      }).success
    ).toBe(false);
  });

  it("validates Telegram login widget payload", () => {
    const validHash = "a".repeat(64);
    expect(
      TelegramAuthRequestSchema.safeParse({
        id: 123456789,
        first_name: "Whisker",
        username: "whisker_cat",
        auth_date: 1700000000,
        hash: validHash,
      }).success
    ).toBe(true);

    expect(
      TelegramAuthRequestSchema.safeParse({
        id: 123456789,
        first_name: "Whisker",
        auth_date: 1700000000,
        hash: "short-hash",
      }).success
    ).toBe(false);
  });
});
