import { create } from "zustand";
import type {
  AdminErrorCode,
  AdminStats,
  AdminUpdateUserRequest,
  AdminUpdateZoneRequest,
  AdminUserSummary,
  AdminZoneSummary,
  UserRole,
} from "@pawlands/protocol";
import {
  AdminApiError,
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminZones,
  updateAdminUser,
  updateAdminZone,
} from "../network/adminClient";

export type AdminTab = "overview" | "users" | "zones";
export type AdminUiErrorCode = AdminErrorCode | "NETWORK_ERROR";

interface AdminStoreState {
  isAdminPanelOpen: boolean;
  activeTab: AdminTab;
  stats: AdminStats | null;
  users: AdminUserSummary[];
  usersTotal: number;
  zones: AdminZoneSummary[];
  searchQuery: string;
  roleFilter: UserRole | "all";
  bannedOnly: boolean;
  isLoading: boolean;
  updatingId: string | null;
  errorCode: AdminUiErrorCode | null;
  openAdminPanel: () => void;
  closeAdminPanel: () => void;
  setActiveTab: (tab: AdminTab) => void;
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: UserRole | "all") => void;
  setBannedOnly: (bannedOnly: boolean) => void;
  clearError: () => void;
  loadAll: (token: string) => Promise<void>;
  loadUsers: (token: string) => Promise<void>;
  updateUser: (
    token: string,
    userId: string,
    payload: AdminUpdateUserRequest
  ) => Promise<boolean>;
  updateZone: (
    token: string,
    zoneId: string,
    payload: AdminUpdateZoneRequest
  ) => Promise<boolean>;
}

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  isAdminPanelOpen: false,
  activeTab: "overview",
  stats: null,
  users: [],
  usersTotal: 0,
  zones: [],
  searchQuery: "",
  roleFilter: "all",
  bannedOnly: false,
  isLoading: false,
  updatingId: null,
  errorCode: null,

  openAdminPanel: () => set({ isAdminPanelOpen: true, errorCode: null }),
  closeAdminPanel: () => set({ isAdminPanelOpen: false, errorCode: null }),
  setActiveTab: (activeTab) => set({ activeTab, errorCode: null }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setRoleFilter: (roleFilter) => set({ roleFilter }),
  setBannedOnly: (bannedOnly) => set({ bannedOnly }),
  clearError: () => set({ errorCode: null }),

  loadAll: async (token) => {
    set({ isLoading: true, errorCode: null });
    try {
      const { searchQuery, roleFilter, bannedOnly } = get();
      const [stats, usersRes, zones] = await Promise.all([
        fetchAdminStats(token),
        fetchAdminUsers(token, {
          search: searchQuery.trim() || undefined,
          role: roleFilter === "all" ? undefined : roleFilter,
          bannedOnly: bannedOnly || undefined,
        }),
        fetchAdminZones(token),
      ]);
      set({
        stats,
        users: usersRes.users,
        usersTotal: usersRes.total,
        zones,
        isLoading: false,
      });
    } catch (err) {
      const code = err instanceof AdminApiError ? err.code : "INTERNAL_ERROR";
      set({ isLoading: false, errorCode: code });
    }
  },

  loadUsers: async (token) => {
    set({ isLoading: true, errorCode: null });
    try {
      const { searchQuery, roleFilter, bannedOnly } = get();
      const usersRes = await fetchAdminUsers(token, {
        search: searchQuery.trim() || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        bannedOnly: bannedOnly || undefined,
      });
      set({
        users: usersRes.users,
        usersTotal: usersRes.total,
        isLoading: false,
      });
    } catch (err) {
      const code = err instanceof AdminApiError ? err.code : "INTERNAL_ERROR";
      set({ isLoading: false, errorCode: code });
    }
  },

  updateUser: async (token, userId, payload) => {
    set({ updatingId: userId, errorCode: null });
    try {
      const updated = await updateAdminUser(token, userId, payload);
      const stats = await fetchAdminStats(token);
      set((state) => ({
        users: state.users.map((u) => (u.id === userId ? updated : u)),
        stats,
        updatingId: null,
      }));
      return true;
    } catch (err) {
      const code = err instanceof AdminApiError ? err.code : "INTERNAL_ERROR";
      set({ updatingId: null, errorCode: code });
      return false;
    }
  },

  updateZone: async (token, zoneId, payload) => {
    set({ updatingId: zoneId, errorCode: null });
    try {
      const updated = await updateAdminZone(token, zoneId, payload);
      set((state) => ({
        zones: state.zones.map((z) => (z.id === zoneId ? updated : z)),
        updatingId: null,
      }));
      return true;
    } catch (err) {
      const code = err instanceof AdminApiError ? err.code : "INTERNAL_ERROR";
      set({ updatingId: null, errorCode: code });
      return false;
    }
  },
}));
