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
      accountSettings: "Account Settings",
      language: "Language",
      chooseArchetype: "Choose your feline",
      archetypeSubtitle: "Each archetype has distinct survival stats, carry capacity, and speed.",
      worldSelection: "World Selection",
      worldSelectionSubtitle: "Choose a starting map to begin your adventure.",
      enterWorld: "Enter {{zone}}",
      enterOnline: "Play online",
      worldConnectionFailed: "Connection to the world ended. Try joining again.",
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
        "Mobile: Tap the ground or use the joystick to move, RUN (Sprint), ATK (Attack), USE (Interact)",
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
      minimap: {
        title: "Map",
        show: "Show map",
        hide: "Hide map",
        player: "You",
        portal: "Portal",
        spawn: "Spawn",
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
        continueWithApple: "Continue with Apple",
        submitting: "Please wait...",
        orDivider: "or",
        googleButton: "Continue with Google",
        yandexLogin: "Sign in with Yandex ID",
        yandexRegister: "Register with Yandex ID",
        telegramButton: "Continue with Telegram",
        telegramNotConfigured: "Set VITE_TELEGRAM_BOT_USERNAME to enable Telegram sign-in.",
        vkLoginButton: "Continue with VK ID",
        errors: {
          VALIDATION_ERROR: "Please check the entered fields and try again.",
          EMAIL_TAKEN: "An account with this email already exists.",
          USERNAME_TAKEN: "This username is already taken.",
          INVALID_CREDENTIALS: "Invalid email/username or password.",
          ACCOUNT_BANNED: "This account has been banned.",
          INVALID_TELEGRAM_AUTH: "Telegram verification failed or expired. Please try again.",
          TELEGRAM_NOT_CONFIGURED: "Telegram sign-in is not configured on the server.",
          UNAUTHORIZED: "Your session has expired. Please sign in again.",
          GOOGLE_AUTH_NOT_CONFIGURED: "Google sign-in is not configured on the server.",
          GOOGLE_AUTH_FAILED: "Google sign-in failed or was cancelled.",
          YANDEX_NOT_CONFIGURED: "Yandex ID sign-in is not configured on this server.",
          YANDEX_INVALID_STATE: "Yandex ID session expired or invalid. Please try again.",
          YANDEX_ACCESS_DENIED: "Yandex ID authorization was cancelled.",
          YANDEX_AUTH_FAILED: "Could not complete Yandex ID sign-in. Please try again.",
          APPLE_AUTH_FAILED: "Apple Sign-In failed. Please try again.",
          APPLE_NOT_CONFIGURED: "Apple Sign-In is not configured on this server.",
          APPLE_POPUP_CANCELLED: "Apple Sign-In was cancelled.",
          PASSWORDS_MISMATCH: "Passwords do not match.",
          VK_AUTH_NOT_CONFIGURED: "VK ID sign-in is not configured yet.",
          VK_AUTH_FAILED: "VK ID sign-in failed. Please try again.",
          VK_STATE_MISMATCH: "VK ID session verification failed. Please try again.",
          NETWORK_ERROR: "Cannot reach the server. Check your connection.",
          INTERNAL_ERROR: "Something went wrong. Please try again.",
        },
      },
      admin: {
        button: "Admin",
        badge: "Admin Panel",
        title: "Administration",
        subtitle: "Manage users, roles, moderation, and world zone settings.",
        refresh: "Refresh",
        loading: "Loading...",
        save: "Save",
        cancel: "Cancel",
        tabs: {
          overview: "Overview",
          users: "Users",
          zones: "Zones",
        },
        stats: {
          totalUsers: "Total Users",
          staffUsers: "Staff (Admins & Mods)",
          bannedUsers: "Banned Users",
          totalCharacters: "Characters",
          totalCoins: "Total Coins",
          totalZones: "World Zones",
        },
        roles: {
          player: "Player",
          moderator: "Moderator",
          admin: "Admin",
        },
        users: {
          searchPlaceholder: "Search by username or email...",
          allRoles: "All roles",
          bannedOnly: "Banned only",
          filter: "Apply",
          showingCount: "Showing {{count}} of {{total}} users",
          empty: "No users match the current filter.",
          you: "You",
          statusActive: "Active",
          statusBanned: "Banned",
          charactersCount: "{{count}} chars",
          banReasonPrefix: "Reason",
          roleLabel: "Role",
          ban: "Ban",
          unban: "Unban",
          banReasonPlaceholder: "Optional ban reason...",
          confirmBan: "Confirm Ban",
        },
        zones: {
          pvpEnabled: "PvP Enabled",
        },
        errors: {
          VALIDATION_ERROR: "Invalid request parameters.",
          UNAUTHORIZED: "Authentication required. Please sign in again.",
          FORBIDDEN: "Administrator privileges required.",
          NOT_FOUND: "Requested record was not found.",
          CANNOT_MODIFY_SELF: "You cannot ban or demote your own account.",
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
      accountSettings: "Настройки аккаунта",
      language: "Язык",
      chooseArchetype: "Выберите своего кота",
      archetypeSubtitle:
        "У каждого архетипа свои показатели выживания, грузоподъёмность и скорость.",
      worldSelection: "Выбор мира",
      worldSelectionSubtitle: "Выберите стартовую карту для начала игры.",
      enterWorld: "Войти: {{zone}}",
      enterOnline: "Играть онлайн",
      worldConnectionFailed: "Связь с миром прервалась. Попробуйте войти снова.",
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
        "Телефон: Коснитесь земли или используйте джойстик для движения, RUN (Рывок), ATK (Атака), USE (Взаимодействие)",
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
      minimap: {
        title: "Карта",
        show: "Показать карту",
        hide: "Скрыть карту",
        player: "Вы",
        portal: "Портал",
        spawn: "Точка входа",
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
        continueWithApple: "Войти через Apple",
        submitting: "Подождите...",
        orDivider: "или",
        googleButton: "Войти через Google",
        yandexLogin: "Войти через Яндекс ID",
        yandexRegister: "Регистрация через Яндекс ID",
        telegramButton: "Войти через Telegram",
        telegramNotConfigured: "Укажите VITE_TELEGRAM_BOT_USERNAME для входа через Telegram.",
        vkLoginButton: "Войти через VK ID",
        errors: {
          VALIDATION_ERROR: "Проверьте правильность заполнения полей.",
          EMAIL_TAKEN: "Аккаунт с таким email уже существует.",
          USERNAME_TAKEN: "Это имя пользователя уже занято.",
          INVALID_CREDENTIALS: "Неверный логин или пароль.",
          ACCOUNT_BANNED: "Этот аккаунт заблокирован.",
          INVALID_TELEGRAM_AUTH: "Ошибка проверки Telegram или срок действия истёк. Попробуйте снова.",
          TELEGRAM_NOT_CONFIGURED: "Вход через Telegram не настроен на сервере.",
          UNAUTHORIZED: "Сессия истекла. Войдите снова.",
          GOOGLE_AUTH_NOT_CONFIGURED: "Вход через Google не настроен на сервере.",
          GOOGLE_AUTH_FAILED: "Не удалось войти через Google или вход был отменён.",
          YANDEX_NOT_CONFIGURED: "Вход через Яндекс ID не настроен на сервере.",
          YANDEX_INVALID_STATE: "Сессия Яндекс ID устарела или некорректна. Попробуйте снова.",
          YANDEX_ACCESS_DENIED: "Авторизация через Яндекс ID отменена.",
          YANDEX_AUTH_FAILED: "Не удалось войти через Яндекс ID. Попробуйте снова.",
          APPLE_AUTH_FAILED: "Не удалось войти через Apple. Попробуйте ещё раз.",
          APPLE_NOT_CONFIGURED: "Вход через Apple не настроен на сервере.",
          APPLE_POPUP_CANCELLED: "Вход через Apple был отменён.",
          PASSWORDS_MISMATCH: "Пароли не совпадают.",
          VK_AUTH_NOT_CONFIGURED: "Вход через VK ID ещё не настроен.",
          VK_AUTH_FAILED: "Не удалось войти через VK ID. Попробуйте снова.",
          VK_STATE_MISMATCH: "Ошибка проверки сессии VK ID. Попробуйте снова.",
          NETWORK_ERROR: "Нет связи с сервером. Проверьте подключение.",
          INTERNAL_ERROR: "Произошла ошибка. Попробуйте ещё раз.",
        },
      },
      admin: {
        button: "Админ",
        badge: "Админ-панель",
        title: "Управление сервером",
        subtitle: "Пользователи, роли, модерация и настройки игровых зон.",
        refresh: "Обновить",
        loading: "Загрузка...",
        save: "Сохранить",
        cancel: "Отмена",
        tabs: {
          overview: "Обзор",
          users: "Пользователи",
          zones: "Зоны",
        },
        stats: {
          totalUsers: "Всего пользователей",
          staffUsers: "Персонал (Админы и моды)",
          bannedUsers: "Заблокированы",
          totalCharacters: "Персонажей",
          totalCoins: "Монет в обороте",
          totalZones: "Игровых зон",
        },
        roles: {
          player: "Игрок",
          moderator: "Модератор",
          admin: "Администратор",
        },
        users: {
          searchPlaceholder: "Поиск по имени или email...",
          allRoles: "Все роли",
          bannedOnly: "Только заблокированные",
          filter: "Найти",
          showingCount: "Показано {{count}} из {{total}} пользователей",
          empty: "Пользователи не найдены.",
          you: "Вы",
          statusActive: "Активен",
          statusBanned: "Заблокирован",
          charactersCount: "Персонажей: {{count}}",
          banReasonPrefix: "Причина",
          roleLabel: "Роль",
          ban: "Бан",
          unban: "Разбан",
          banReasonPlaceholder: "Причина блокировки (необязательно)...",
          confirmBan: "Заблокировать",
        },
        zones: {
          pvpEnabled: "PvP включён",
        },
        errors: {
          VALIDATION_ERROR: "Проверьте корректность введённых данных.",
          UNAUTHORIZED: "Требуется авторизация. Войдите снова.",
          FORBIDDEN: "Недостаточно прав. Требуется роль администратора.",
          NOT_FOUND: "Запись не найдена.",
          CANNOT_MODIFY_SELF: "Нельзя заблокировать или понизить свой аккаунт.",
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
