import { create } from 'zustand';

export interface AppUser {
    id: number;
    username: string;
    role: 'admin' | 'caissier';
    is_active: boolean;
}

export interface TableStatus {
    id: number;
    table_number: string;
    zone_type: 'VIP' | 'Stage' | 'Simple';
    coordinates: { x: number; y: number; w: number; h: number };
    capacity: number;
    status: 'free' | 'reserved' | 'occupied';
}

interface AppState {
    user: AppUser | null;
    token: string | null;
    selectedDate: string;
    tableStatuses: TableStatus[];
    linkedTables: number[];   // table ids selected in link mode
    linkMode: boolean;

    setUser: (user: AppUser | null) => void;
    setToken: (token: string | null) => void;
    setSelectedDate: (date: string) => void;
    setTableStatuses: (statuses: TableStatus[]) => void;
    toggleLinkMode: () => void;
    addLinkedTable: (id: number) => void;
    removeLinkedTable: (id: number) => void;
    clearLinkedTables: () => void;
    logout: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

export const useAppStore = create<AppState>((set, get) => ({
    user: null,
    token: null,
    selectedDate: today(),
    tableStatuses: [],
    linkedTables: [],
    linkMode: false,

    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),
    setSelectedDate: (date) => set({ selectedDate: date }),
    setTableStatuses: (statuses) => set({ tableStatuses: statuses }),
    toggleLinkMode: () => set((s) => ({ linkMode: !s.linkMode, linkedTables: [] })),
    addLinkedTable: (id) => set((s) => ({ linkedTables: [...s.linkedTables, id] })),
    removeLinkedTable: (id) => set((s) => ({ linkedTables: s.linkedTables.filter((t) => t !== id) })),
    clearLinkedTables: () => set({ linkedTables: [] }),
    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        set({ user: null, token: null });
    },
}));
