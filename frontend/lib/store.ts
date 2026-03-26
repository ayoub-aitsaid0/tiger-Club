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
    zone_type: 'Orange' | 'Teal' | 'Grey' | 'Purple' | 'White';
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
    operatorName: string | null;  // daily shift operator

    setUser: (user: AppUser | null) => void;
    setToken: (token: string | null) => void;
    setSelectedDate: (date: string) => void;
    setTableStatuses: (statuses: TableStatus[]) => void;
    toggleLinkMode: () => void;
    addLinkedTable: (id: number) => void;
    removeLinkedTable: (id: number) => void;
    clearLinkedTables: () => void;
    setOperatorName: (name: string | null) => void;
    logout: () => void;
}

// Returns the "service date" — the shift period runs from 18:30 on day N to 18:29 on day N+1.
// Before 18:30 we're still in yesterday's service period.
function serviceDate(): string {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() < 30)) {
        d.setDate(d.getDate() - 1);
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useAppStore = create<AppState>((set, get) => ({
    user: null,
    token: null,
    selectedDate: serviceDate(),
    tableStatuses: [],
    linkedTables: [],
    linkMode: false,
    operatorName: null,

    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),
    setSelectedDate: (date) => set({ selectedDate: date }),
    setTableStatuses: (statuses) => set({ tableStatuses: statuses }),
    toggleLinkMode: () => set((s) => ({ linkMode: !s.linkMode, linkedTables: [] })),
    addLinkedTable: (id) => set((s) => ({ linkedTables: [...s.linkedTables, id] })),
    removeLinkedTable: (id) => set((s) => ({ linkedTables: s.linkedTables.filter((t) => t !== id) })),
    clearLinkedTables: () => set({ linkedTables: [] }),
    setOperatorName: (name) => set({ operatorName: name }),
    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        set({ user: null, token: null });
    },
}));
