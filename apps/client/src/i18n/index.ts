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
        archetypeSubtitle: "Each archetype has distinct survival stats, carry capacity, and speed.",
        enterWorld: "Enter Oakpaw Village",
        applyChanges: "Apply & Resume",
        close: "Close",
        speed: "Speed",
        carry: "Carry",
        safeZone: "Safe Zone",
        touchPad: "Touch",
        changeArchetype: "Change Cat",
        controlsHint: "Desktop: WASD / Arrows, Shift (Sprint), Space (Attack), E (Interact)",
        statusOffline: "Offline Preview",
        statusConnecting: "Connecting...",
        statusConnected: "Connected",
      },
    },
  },
});

export default i18n;
