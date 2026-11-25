import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { TelegramAuthRequest } from "@pawlands/protocol";

const DEFAULT_TELEGRAM_AUTH_MAX_AGE_SEC = 60 * 60 * 24; // 24 hours
const MAX_FUTURE_CLOCK_SKEW_SEC = 60;

export function resolveTelegramBotToken(): string | undefined {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token ? token : undefined;
}

/**
 * Verifies Telegram Login Widget payload using HMAC-SHA256(data_check_string, SHA256(bot_token)).
 */
export function verifyTelegramAuthPayload(
  payload: TelegramAuthRequest,
  botToken: string,
  maxAgeSec = DEFAULT_TELEGRAM_AUTH_MAX_AGE_SEC,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!botToken) {
    return false;
  }

  if (payload.auth_date > nowSec + MAX_FUTURE_CLOCK_SKEW_SEC) {
    return false;
  }

  if (nowSec - payload.auth_date > maxAgeSec) {
    return false;
  }

  const fields: Array<[string, string]> = [
    ["auth_date", String(payload.auth_date)],
    ["first_name", payload.first_name],
    ["id", String(payload.id)],
  ];

  if (payload.last_name !== undefined) {
    fields.push(["last_name", payload.last_name]);
  }
  if (payload.photo_url !== undefined) {
    fields.push(["photo_url", payload.photo_url]);
  }
  if (payload.username !== undefined) {
    fields.push(["username", payload.username]);
  }

  fields.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const dataCheckString = fields.map(([key, value]) => `${key}=${value}`).join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();

  let actualHash: Buffer;
  try {
    actualHash = Buffer.from(payload.hash, "hex");
  } catch {
    return false;
  }

  if (expectedHash.length !== actualHash.length) {
    return false;
  }

  return timingSafeEqual(expectedHash, actualHash);
}
