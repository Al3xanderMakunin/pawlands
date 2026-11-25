import { useEffect, useState, type ReactNode } from "react";

const MODAL_TRANSITION_MS = 200;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface AnimatedModalProps {
  isOpen: boolean;
  children: ReactNode;
  backdropClassName?: string;
  panelClassName?: string;
  ariaLabelledBy?: string;
}

/**
 * Wraps modal window content with smooth enter/exit fade and scale transitions.
 * Keeps the DOM mounted during the exit transition before unmounting.
 */
export function AnimatedModal({
  isOpen,
  children,
  backdropClassName = "",
  panelClassName = "",
  ariaLabelledBy,
}: AnimatedModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      if (prefersReducedMotion()) {
        setIsVisible(true);
        return;
      }

      let raf1 = 0;
      let raf2 = 0;
      // Double rAF ensures the initial closed frame is painted before transitioning to open.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });

      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }

    setIsVisible(false);
    if (!shouldRender) return;

    const delay = prefersReducedMotion() ? 0 : MODAL_TRANSITION_MS;
    const timer = window.setTimeout(() => {
      setShouldRender(false);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      className={`absolute inset-0 flex items-center justify-center backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      } ${isVisible ? "opacity-100" : "opacity-0"} ${backdropClassName}`}
    >
      <div
        className={`transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        } ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
