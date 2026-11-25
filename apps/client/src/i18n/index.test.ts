import { describe, expect, it } from "vitest";
import i18n, { isSupportedLanguage, resources, setAppLanguage } from "./index.js";

function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe("i18n configuration", () => {
  it("provides identical translation keys for English and Russian", () => {
    const enKeys = collectKeys(resources.en.translation);
    const ruKeys = collectKeys(resources.ru.translation);

    expect(ruKeys).toEqual(enKeys);
  });

  it("validates supported languages", () => {
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("ru")).toBe(true);
    expect(isSupportedLanguage("de")).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
  });

  it("switches active language to Russian and back to English", async () => {
    await setAppLanguage("ru");
    expect(i18n.language).toBe("ru");
    expect(i18n.t("chooseArchetype")).toBe("Выберите своего кота");
    expect(i18n.t("zones.oakpaw_village")).toBe("Деревня Дубовой Лапы");

    await setAppLanguage("en");
    expect(i18n.language).toBe("en");
    expect(i18n.t("chooseArchetype")).toBe("Choose your feline");
  });
});
