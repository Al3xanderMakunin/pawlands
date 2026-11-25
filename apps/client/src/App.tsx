import { useEffect, useRef } from "react";
import { ArchetypeSelectModal } from "./components/ArchetypeSelectModal";
import { AuthModal } from "./components/AuthModal";
import { HudOverlay } from "./components/HudOverlay";
import { createGame } from "./game/createGame";
import { useAuthStore } from "./stores/useAuthStore";

export function App() {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void useAuthStore.getState().restoreSession();
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    const game = createGame(host);
    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 font-sans select-none">
      <div ref={canvasHostRef} className="h-full w-full" />
      <HudOverlay />
      <ArchetypeSelectModal />
      <AuthModal />
    </div>
  );
}
