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
      worldSelection: "World Selection",
      worldSelectionSubtitle: "Choose a starting map to begin your adventure.",
      enterWorld: "Enter {{zone}}",
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
      mobileControlsHint:
        "Mobile: Virtual joystick to move, RUN (Sprint), ATK (Attack), USE (Interact)",
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
      zoneDescriptions: {
        oakpaw_village: "Safe feline settlement with quest givers, merchants, and crafting stations.",
        whispering_woods:
          "Sunlit forest rich with herbs, small prey, and introductory hunting quests.",
        clawpeak_ridge:
          "Rocky highland trails with ore veins, mountain predators, and skirmishes.",
        sunken_crypt: "Ancient underground ruin housing elite enemies and rare gear.",
        bloodclaw_wilds: "Contested open PvP frontier with high-tier loot and clan territory.",
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
      auth: {
        signIn: "Sign In",
        signOut: "Sign Out",
        guestNotice: "Playing as guest",
        signedInAs: "Signed in as",
        openAuthLink: "Sign in or Register",
        loginTitle: "Sign in to Pawlands",
        loginSubtitle: "Access your saved feline characters and progress.",
        registerTitle: "Create your account",
        registerSubtitle: "Join Pawlands and save your survival progress.",
        loginTab: "Sign In",
        registerTab: "Register",
        emailLabel: "Email",
        usernameLabel: "Username",
        usernameHint: "3–24 characters: letters, numbers, _ or -",
        identifierLabel: "Email or Username",
        identifierPlaceholder: "whisker@pawlands.gg or Whisker_01",
        passwordLabel: "Password",
        passwordHint: "At least 8 characters",
        confirmPasswordLabel: "Confirm Password",
        loginSubmit: "Sign In",
        registerSubmit: "Create Account",
        submitting: "Please wait...",
        errors: {
          VALIDATION_ERROR: "Please check the entered fields and try again.",
          EMAIL_TAKEN: "An account with this email already exists.",
          USERNAME_TAKEN: "This username is already taken.",
          INVALID_CREDENTIALS: "Invalid email/username or password.",
          UNAUTHORIZED: "Your session has expired. Please sign in again.",
          PASSWORDS_MISMATCH: "Passwords do not match.",
          NETWORK_ERROR: "Cannot reach the server. Check your connection.",
          INTERNAL_ERROR: "Something went wrong. Please try again.",
        },
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
      worldSelection: "Выбор мира",
      worldSelectionSubtitle: "Выберите стартовую карту для начала игры.",
      enterWorld: "Войти: {{zone}}",
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
      mobileControlsHint:
        "Телефон: Джойстик для движения, RUN (Рывок), ATK (Атака), USE (Взаимодействие)",
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
      zoneDescriptions: {
        oakpaw_village: "Безопасное кошачье поселение с квестами, торговцами и верстаками.",
        whispering_woods: "Солнечный лес с травами, мелкой дичью и первыми заданиями на охоту.",
        clawpeak_ridge: "Каменистые горные тропы с жилами руды, хищниками и стычками.",
        sunken_crypt: "Древние подземные руины с элитными врагами и редким снаряжением.",
        bloodclaw_wilds: "Спорные PvP-земли с ценной добычей и территориями кланов.",
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
      auth: {
        signIn: "Войти",
        signOut: "Выйти",
        guestNotice: "Гостевой режим",
        signedInAs: "Вы вошли как",
        openAuthLink: "Войти или зарегистрироваться",
        loginTitle: "Вход в Pawlands",
        loginSubtitle: "Войдите, чтобы сохранить персонажей и прогресс.",
        registerTitle: "Регистрация аккаунта",
        registerSubtitle: "Создайте аккаунт Pawlands и сохраняйте прогресс выживания.",
        loginTab: "Вход",
        registerTab: "Регистрация",
        emailLabel: "Email",
        usernameLabel: "Имя пользователя",
        usernameHint: "От 3 до 24 символов: латиница, цифры, _ или -",
        identifierLabel: "Email или имя пользователя",
        identifierPlaceholder: "whisker@pawlands.gg или Whisker_01",
        passwordLabel: "Пароль",
        passwordHint: "Минимум 8 символов",
        confirmPasswordLabel: "Подтвердите пароль",
        loginSubmit: "Войти",
        registerSubmit: "Создать аккаунт",
        submitting: "Подождите...",
        errors: {
          VALIDATION_ERROR: "Проверьте правильность заполнения полей.",
          EMAIL_TAKEN: "Аккаунт с таким email уже существует.",
          USERNAME_TAKEN: "Это имя пользователя уже занято.",
          INVALID_CREDENTIALS: "Неверный логин или пароль.",
          UNAUTHORIZED: "Сессия истекла. Войдите снова.",
          PASSWORDS_MISMATCH: "Пароли не совпадают.",
          NETWORK_ERROR: "Нет связи с сервером. Проверьте подключение.",
          INTERNAL_ERROR: "Произошла ошибка. Попробуйте ещё раз.",
        },
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
