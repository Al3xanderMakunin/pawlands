import { useEffect, useRef, useState } from "react";
import { AccountSettingsModal } from "./components/AccountSettingsModal";
import { AdminPanelModal } from "./components/AdminPanelModal";
import { ArchetypeSelectModal } from "./components/ArchetypeSelectModal";
import { AuthModal } from "./components/AuthModal";
import { HudOverlay } from "./components/HudOverlay";
import { createGame } from "./game/createGame";
import { useAuthStore } from "./stores/useAuthStore";

export function App() {
  const [isAccountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void (async () => {
      const handledVk = await useAuthStore.getState().completeVkCallback();
      if (!handledVk) {
        await useAuthStore.getState().handleOAuthCallbackFromUrl();
      }
    })();
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
      <HudOverlay onOpenAccountSettings={() => setAccountSettingsOpen(true)} />
      <ArchetypeSelectModal onOpenAccountSettings={() => setAccountSettingsOpen(true)} />
      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
      />
      <AuthModal />
      <AdminPanelModal />
    </div>
  );
}
