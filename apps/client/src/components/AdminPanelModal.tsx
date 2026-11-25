import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { AdminZoneSummary, UserRole } from "@pawlands/protocol";
import { useAdminStore, type AdminTab } from "../stores/useAdminStore";
import { useAuthStore } from "../stores/useAuthStore";

const ROLES: UserRole[] = ["player", "moderator", "admin"];

interface ZoneRowProps {
  zone: AdminZoneSummary;
  isUpdating: boolean;
  onSave: (zoneId: string, patch: { isPvpEnabled: boolean; spawnX: number; spawnY: number }) => void;
}

function ZoneRow({ zone, isUpdating, onSave }: ZoneRowProps) {
  const { t } = useTranslation();
  const [isPvpEnabled, setIsPvpEnabled] = useState(zone.isPvpEnabled);
  const [spawnX, setSpawnX] = useState(String(zone.spawnX));
  const [spawnY, setSpawnY] = useState(String(zone.spawnY));

  useEffect(() => {
    setIsPvpEnabled(zone.isPvpEnabled);
    setSpawnX(String(zone.spawnX));
    setSpawnY(String(zone.spawnY));
  }, [zone]);

  const parsedX = Number(spawnX);
  const parsedY = Number(spawnY);
  const isValidCoords =
    Number.isFinite(parsedX) &&
    Number.isFinite(parsedY) &&
    parsedX >= 0 &&
    parsedX <= 10000 &&
    parsedY >= 0 &&
    parsedY <= 10000;

  const isDirty =
    isPvpEnabled !== zone.isPvpEnabled ||
    parsedX !== zone.spawnX ||
    parsedY !== zone.spawnY;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100">
            {t(`zones.${zone.id}`, { defaultValue: zone.name })}
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-400">
            {zone.id}
          </span>
          <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300">
            {zone.type}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-200">
          <input
            type="checkbox"
            checked={isPvpEnabled}
            onChange={(e) => setIsPvpEnabled(e.target.checked)}
            className="accent-rose-500"
          />
          <span>{t("admin.zones.pvpEnabled")}</span>
        </label>

        <label className="flex items-center gap-1 text-slate-400">
          <span>X:</span>
          <input
            type="number"
            min={0}
            max={10000}
            value={spawnX}
            onChange={(e) => setSpawnX(e.target.value)}
            className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-amber-400"
          />
        </label>

        <label className="flex items-center gap-1 text-slate-400">
          <span>Y:</span>
          <input
            type="number"
            min={0}
            max={10000}
            value={spawnY}
            onChange={(e) => setSpawnY(e.target.value)}
            className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-amber-400"
          />
        </label>

        <button
          type="button"
          disabled={!isDirty || !isValidCoords || isUpdating}
          onClick={() =>
            onSave(zone.id, {
              isPvpEnabled,
              spawnX: parsedX,
              spawnY: parsedY,
            })
          }
          className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("admin.save")}
        </button>
      </div>
    </div>
  );
}

export function AdminPanelModal() {
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  const {
    isAdminPanelOpen,
    activeTab,
    stats,
    users,
    usersTotal,
    zones,
    searchQuery,
    roleFilter,
    bannedOnly,
    isLoading,
    updatingId,
    errorCode,
    closeAdminPanel,
    setActiveTab,
    setSearchQuery,
    setRoleFilter,
    setBannedOnly,
    loadAll,
    loadUsers,
    updateUser,
    updateZone,
  } = useAdminStore();

  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [banReasonDraft, setBanReasonDraft] = useState("");

  useEffect(() => {
    if (isAdminPanelOpen && token && user?.role === "admin") {
      void loadAll(token);
    }
  }, [isAdminPanelOpen, token, user?.role, loadAll]);

  if (!isAdminPanelOpen || !token || user?.role !== "admin") {
    return null;
  }

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    void loadUsers(token);
  };

  const handleBanConfirm = async (userId: string) => {
    const trimmed = banReasonDraft.trim();
    const ok = await updateUser(token, userId, {
      isBanned: true,
      banReason: trimmed || null,
    });
    if (ok) {
      setBanningUserId(null);
      setBanReasonDraft("");
    }
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "overview", label: t("admin.tabs.overview") },
    { id: "users", label: t("admin.tabs.users") },
    { id: "zones", label: t("admin.tabs.zones") },
  ];

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700/90 bg-slate-900/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              {t("title")} • {t("admin.badge")}
            </p>
            <h2 id="admin-panel-title" className="mt-0.5 text-xl font-bold text-slate-100">
              {t("admin.title")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{t("admin.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void loadAll(token)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-400 disabled:opacity-50"
            >
              {isLoading ? t("admin.loading") : t("admin.refresh")}
            </button>
            <button
              type="button"
              onClick={closeAdminPanel}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500"
            >
              {t("close")}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 px-5 py-2.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {errorCode && (
          <div className="mx-5 mt-3 rounded-lg border border-rose-500/40 bg-rose-950/50 px-3.5 py-2 text-xs text-rose-200">
            {t(`admin.errors.${errorCode}`, { defaultValue: errorCode })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "overview" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-400">{t("admin.stats.totalUsers")}</p>
                <p className="mt-1 text-2xl font-bold text-slate-100">
                  {stats?.totalUsers ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-400">{t("admin.stats.staffUsers")}</p>
                <p className="mt-1 text-2xl font-bold text-amber-300">
                  {stats ? stats.adminUsers + stats.moderatorUsers : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-400">{t("admin.stats.bannedUsers")}</p>
                <p className="mt-1 text-2xl font-bold text-rose-400">
                  {stats?.bannedUsers ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-400">{t("admin.stats.totalCharacters")}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">
                  {stats?.totalCharacters ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-400">{t("admin.stats.totalCoins")}</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">
                  {stats?.totalCoins ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-400">{t("admin.stats.totalZones")}</p>
                <p className="mt-1 text-2xl font-bold text-sky-300">
                  {stats?.totalZones ?? "—"}
                </p>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("admin.users.searchPlaceholder")}
                  className="min-w-[180px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-amber-400"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                >
                  <option value="all">{t("admin.users.allRoles")}</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t(`admin.roles.${r}`)}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={bannedOnly}
                    onChange={(e) => setBannedOnly(e.target.checked)}
                    className="accent-rose-500"
                  />
                  <span>{t("admin.users.bannedOnly")}</span>
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                >
                  {t("admin.users.filter")}
                </button>
              </form>

              <div className="text-xs text-slate-400">
                {t("admin.users.showingCount", { count: users.length, total: usersTotal })}
              </div>

              {users.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                  {t("admin.users.empty")}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {users.map((entry) => {
                    const isSelf = entry.id === user.id;
                    const isRowUpdating = updatingId === entry.id;

                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-100">
                                @{entry.username}
                              </span>
                              {isSelf && (
                                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                                  {t("admin.users.you")}
                                </span>
                              )}
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                                  entry.isBanned
                                    ? "bg-rose-950/90 text-rose-300"
                                    : "bg-emerald-950/90 text-emerald-300"
                                }`}
                              >
                                {entry.isBanned
                                  ? t("admin.users.statusBanned")
                                  : t("admin.users.statusActive")}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {t("admin.users.charactersCount", { count: entry.characterCount })}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-400">{entry.email}</p>
                            {entry.isBanned && entry.banReason && (
                              <p className="mt-1 text-[11px] text-rose-300">
                                {t("admin.users.banReasonPrefix")}: {entry.banReason}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <select
                              aria-label={t("admin.users.roleLabel")}
                              value={entry.role}
                              disabled={isSelf || isRowUpdating}
                              onChange={(e) =>
                                void updateUser(token, entry.id, {
                                  role: e.target.value as UserRole,
                                })
                              }
                              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-100 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {t(`admin.roles.${r}`)}
                                </option>
                              ))}
                            </select>

                            {entry.isBanned ? (
                              <button
                                type="button"
                                disabled={isSelf || isRowUpdating}
                                onClick={() =>
                                  void updateUser(token, entry.id, {
                                    isBanned: false,
                                    banReason: null,
                                  })
                                }
                                className="rounded-lg border border-emerald-500/50 bg-emerald-950/60 px-3 py-1.5 font-semibold text-emerald-200 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {t("admin.users.unban")}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isSelf || isRowUpdating}
                                onClick={() => {
                                  setBanningUserId(entry.id);
                                  setBanReasonDraft("");
                                }}
                                className="rounded-lg border border-rose-500/50 bg-rose-950/60 px-3 py-1.5 font-semibold text-rose-200 hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {t("admin.users.ban")}
                              </button>
                            )}
                          </div>
                        </div>

                        {banningUserId === entry.id && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                            <input
                              type="text"
                              value={banReasonDraft}
                              onChange={(e) => setBanReasonDraft(e.target.value)}
                              placeholder={t("admin.users.banReasonPlaceholder")}
                              maxLength={255}
                              className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-rose-400"
                            />
                            <button
                              type="button"
                              disabled={isRowUpdating}
                              onClick={() => void handleBanConfirm(entry.id)}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                              {t("admin.users.confirmBan")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBanningUserId(null);
                                setBanReasonDraft("");
                              }}
                              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
                            >
                              {t("admin.cancel")}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "zones" && (
            <div className="space-y-2.5">
              {zones.map((zone) => (
                <ZoneRow
                  key={zone.id}
                  zone={zone}
                  isUpdating={updatingId === zone.id}
                  onSave={(zoneId, patch) => void updateZone(token, zoneId, patch)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
