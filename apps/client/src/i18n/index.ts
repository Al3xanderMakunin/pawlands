import i18n from "i18next";
import { initReactI18next } from "react-i18next";

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: {
      translation: {
        title: "Pawlands",
        subtitle: "2D Pixel-Art Survival RPG",
        chooseArchetype: "Choose your feline",
        statusOffline: "Offline Preview",
        statusConnecting: "Connecting...",
        statusConnected: "Connected",
      },
    },
  },
});

export default i18n;
