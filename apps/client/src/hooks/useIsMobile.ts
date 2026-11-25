import { useEffect, useState } from "react";

const MOBILE_MAX_WIDTH = 768;

/**
 * Returns true when the client is on a touch-primary device or narrow mobile viewport,
 * matching the touch-controls breakpoint used by WorldScene.
 */
export function detectIsMobile(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const hasCoarsePointer =
    typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return hasCoarsePointer || window.innerWidth < MOBILE_MAX_WIDTH;
}

/**
 * React hook that tracks whether the current environment should display mobile UI.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => detectIsMobile());

  useEffect(() => {
    const update = () => setIsMobile(detectIsMobile());
    update();

    const mediaQuery =
      typeof window.matchMedia === "function" ? window.matchMedia("(pointer: coarse)") : null;

    window.addEventListener("resize", update);
    mediaQuery?.addEventListener("change", update);

    return () => {
      window.removeEventListener("resize", update);
      mediaQuery?.removeEventListener("change", update);
    };
  }, []);

  return isMobile;
}
