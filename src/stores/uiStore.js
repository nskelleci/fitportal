import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // Sidebar State
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  // Modal States
  activeModal: null, // 'exercise', 'program', 'checkin', etc.
  modalData: null,   // Data to pass to the modal
  openModal: (modalName, data = null) => set({ activeModal: modalName, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Notification / Toast State
  toast: null, // { type: 'success' | 'error', message: '...' }
  showToast: (type, message) => set({ toast: { type, message } }),
  hideToast: () => set({ toast: null }),
}));

