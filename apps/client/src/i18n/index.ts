import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGUAGES = ["en", "ru"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "pawlands.language";

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "EN",
  ru: "RU",
};

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return value === "en" || value === "ru";
}

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return "en";
  }
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(saved) ? saved : "en";
  } catch {
    return "en";
  }
}

function syncDocumentLang(lang: SupportedLanguage): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}

export const resources = {
  en: {
    translation: {
      title: "Pawlands",
      subtitle: "2D Pixel-Art Survival RPG",
      language: "Language",
      chooseArchetype: "Choose your feline",
      archetypeSubtitle: "Each archetype has distinct survival stats, carry capacity, and speed.",
      enterWorld: "Enter Oakpaw Village",
      applyChanges: "Apply & Resume",
      close: "Close",
      speed: "Speed",
      carry: "Carry",
      kg: "kg",
      safeZone: "Safe Zone",
      pvpZone: "PvP",
      touchPad: "Touch",
      changeArchetype: "Change Cat",
      controlsHint:
        "Desktop: WASD / Arrows or Click to move, Shift (Sprint), Space (Attack), E (Interact)",
      statusOffline: "Offline Preview",
      statusConnecting: "Connecting...",
      statusConnected: "Connected",
      archetypes: {
        tomcat: {
          label: "Tomcat",
          tagline: "Strength, endurance, and heavy carry capacity",
        },
        cat: {
          label: "Cat",
          tagline: "Agility, balanced speed, and sharp evasion",
        },
        kitten: {
          label: "Kitten",
          tagline: "High mobility, stealth, and deep stamina reserves",
        },
      },
      zones: {
        oakpaw_village: "Oakpaw Village",
        whispering_woods: "Whispering Woods",
        clawpeak_ridge: "Clawpeak Ridge",
        sunken_crypt: "Sunken Crypt",
        bloodclaw_wilds: "Bloodclaw Wilds",
      },
      survivalStatus: {
        well_fed: "well_fed",
        hungry: "hungry",
        famished: "famished",
        starving: "starving",
      },
      encumbrance: {
        light: "light",
        heavy: "heavy",
        overloaded: "overloaded",
      },
      touchMode: {
        auto: "AUTO",
        on: "ON",
        off: "OFF",
      },
      actions: {
        attack: "Attack!",
        interact: "Interact",
      },
    },
  },
  ru: {
    translation: {
      title: "Pawlands",
      subtitle: "2D пиксель-арт RPG на выживание",
      language: "Язык",
      chooseArchetype: "Выберите своего кота",
      archetypeSubtitle:
        "У каждого архетипа свои показатели выживания, грузоподъёмность и скорость.",
      enterWorld: "Войти в Деревню Дубовой Лапы",
      applyChanges: "Применить и продолжить",
      close: "Закрыть",
      speed: "Скорость",
      carry: "Груз",
      kg: "кг",
      safeZone: "Безопасная зона",
      pvpZone: "PvP",
      touchPad: "Сенсор",
      changeArchetype: "Сменить кота",
      controlsHint:
        "ПК: WASD / Стрелки или клик мышью, Shift (Рывок), Пробел (Атака), E (Взаимодействие)",
      statusOffline: "Офлайн-режим",
      statusConnecting: "Подключение...",
      statusConnected: "Подключено",
      archetypes: {
        tomcat: {
          label: "Кот-боец",
          tagline: "Сила, выносливость и высокая грузоподъёмность",
        },
        cat: {
          label: "Кошка",
          tagline: "Ловкость, сбалансированная скорость и уклонение",
        },
        kitten: {
          label: "Котёнок",
          tagline: "Высокая подвижность, скрытность и большой запас энергии",
        },
      },
      zones: {
        oakpaw_village: "Деревня Дубовой Лапы",
        whispering_woods: "Шепчущий Лес",
        clawpeak_ridge: "Хребет Когтистого Пика",
        sunken_crypt: "Затонувший Склеп",
        bloodclaw_wilds: "Дикие Земли Кровавого Когтя",
      },
      survivalStatus: {
        well_fed: "сыт",
        hungry: "голоден",
        famished: "истощён",
        starving: "голодает",
      },
      encumbrance: {
        light: "легко",
        heavy: "тяжело",
        overloaded: "перегруз",
      },
      touchMode: {
        auto: "АВТО",
        on: "ВКЛ",
        off: "ВЫКЛ",
      },
      actions: {
        attack: "Атака!",
        interact: "Взаимодействие",
      },
    },
  },
} as const;

const initialLanguage = getInitialLanguage();
syncDocumentLang(initialLanguage);

void i18n.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  resources,
});

export async function setAppLanguage(lang: SupportedLanguage): Promise<void> {
  syncDocumentLang(lang);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore storage quota or privacy mode errors
    }
  }
  await i18n.changeLanguage(lang);
}

export default i18n;
