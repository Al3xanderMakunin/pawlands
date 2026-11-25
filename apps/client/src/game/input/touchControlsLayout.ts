export interface SafeAreaInsets {
  left: number;
  right: number;
  bottom: number;
}

export interface TouchControlsLayout {
  stickX: number;
  stickY: number;
  attackX: number;
  attackY: number;
  interactX: number;
  interactY: number;
  sprintX: number;
  sprintY: number;
}

export function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") {
    return { left: 0, right: 0, bottom: 0 };
  }
  const style = getComputedStyle(document.documentElement);
  return {
    left: parseFloat(style.getPropertyValue("--safe-area-inset-left")) || 0,
    right: parseFloat(style.getPropertyValue("--safe-area-inset-right")) || 0,
    bottom: parseFloat(style.getPropertyValue("--safe-area-inset-bottom")) || 0,
  };
}

export function computeTouchControlsLayout(
  width: number,
  height: number,
  insets: SafeAreaInsets = { left: 0, right: 0, bottom: 0 }
): TouchControlsLayout {
  const padX = Math.max(76, Math.min(110, width * 0.14));
  const padY = Math.max(76, Math.min(100, height * 0.18));

  const stickX = padX + insets.left;
  const stickY = height - padY - insets.bottom;
  const attackX = width - padX - insets.right;
  const attackY = height - padY - insets.bottom;

  return {
    stickX,
    stickY,
    attackX,
    attackY,
    interactX: attackX - 64,
    interactY: attackY + 14,
    sprintX: attackX - 18,
    sprintY: attackY - 64,
  };
}
