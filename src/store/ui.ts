import { create } from "zustand";

type UiStore = {
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
};

export const useUi = create<UiStore>((set) => ({
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
