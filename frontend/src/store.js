import { create } from 'zustand';

const useStore = create((set) => ({
  selected: null,
  setSelected: (c) => set({ selected: c }),

  // camera dolly on hover
  hoverActive: false,
  setHoverActive: (v) => set({ hoverActive: v }),
}));

export default useStore;
