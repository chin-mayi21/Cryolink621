import { create } from "zustand";

type FieldConnectivityState = {
  browserOnline: boolean | null;
  forceOffline: boolean;
  pendingCount: number;
  setBrowserOnline: (value: boolean) => void;
  setForceOffline: (value: boolean) => void;
  setPendingCount: (n: number) => void;
  isEffectivelyOnline: () => boolean;
};

export const useFieldConnectivity = create<FieldConnectivityState>((set, get) => ({
  browserOnline: null,
  forceOffline: false,
  pendingCount: 0,
  setBrowserOnline: (value) => set({ browserOnline: value }),
  setForceOffline: (value) => set({ forceOffline: value }),
  setPendingCount: (n) => set({ pendingCount: n }),
  isEffectivelyOnline: () => {
    if (get().forceOffline) return false;
    return get().browserOnline === true;
  },
}));
