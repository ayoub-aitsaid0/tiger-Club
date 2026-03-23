'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useAppStore, TableStatus } from '@/lib/store';
import ReservationModal from '@/components/ReservationModal';
import toast from 'react-hot-toast';
import { Link2, Link2Off, RefreshCw, Calendar, X } from 'lucide-react';

const FloorMap = dynamic(() => import('@/components/FloorMap'), { ssr: false });

const LEGEND = [
    { label: 'Libre',   color: '#c8a84b' },
    { label: 'Réservé', color: '#dc2626' },
    { label: 'Occupé',  color: '#d97706' },
    { label: 'VIP',     color: '#7c3aed' },
];

export default function PlanPage() {
    const {
        selectedDate, setSelectedDate,
        tableStatuses, setTableStatuses,
        linkMode, toggleLinkMode,
        linkedTables, clearLinkedTables,
    } = useAppStore();
    const [loading, setLoading]         = useState(false);
    const [modalTables, setModalTables] = useState<TableStatus[] | null>(null);

    const fetchStatuses = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/tables/status?date=${selectedDate}`);
            setTableStatuses(data);
        } catch {
            toast.error('Impossible de charger le plan');
        } finally {
            setLoading(false);
        }
    }, [selectedDate, setTableStatuses]);

    useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

    const handleTableClick = (table: TableStatus) => {
        if (table.status !== 'free') {
            toast.error(
                `Table ${table.table_number} est déjà ${table.status === 'reserved' ? 'réservée' : 'occupée'}`
            );
            return;
        }
        setModalTables([table]);
    };

    const handleGroupReserve = () => {
        const selected = tableStatuses.filter((t: TableStatus) => linkedTables.includes(t.id));
        const nonFree  = selected.filter((t: TableStatus) => t.status !== 'free');
        if (nonFree.length > 0) {
            toast.error(`Table(s) ${nonFree.map((t: TableStatus) => t.table_number).join(', ')} non disponible(s)`);
            return;
        }
        if (selected.length === 0) { toast.error('Sélectionnez au moins une table'); return; }
        setModalTables(selected);
    };

    return (
        <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#1A1410' }}>

            {/* ── MAP (full screen) ───────────────────────────────── */}
            <div style={{ position: 'absolute', inset: 0 }}>
                {tableStatuses.length > 0 ? (
                    <FloorMap tables={tableStatuses} onTableClick={handleTableClick} />
                ) : (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '100%', color: '#c8a84b', fontSize: '0.9rem', letterSpacing: '0.05em',
                    }}>
                        {loading ? 'Chargement du plan...' : 'Aucune donnée disponible'}
                    </div>
                )}
            </div>

            {/* ── OVERLAY CONTROL BAR (top) ───────────────────────── */}
            <div style={{
                position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(8,8,14,0.82)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(200,168,75,0.2)',
                borderRadius: 12,
                padding: '6px 12px',
                zIndex: 20,
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                flexWrap: 'wrap',
                maxWidth: 'calc(100vw - 40px)',
            }}>
                {/* Date picker */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(200,168,75,0.07)',
                    border: '1px solid rgba(200,168,75,0.18)',
                    borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
                }}>
                    <Calendar size={12} color="#c8a84b" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e: { target: { value: string } }) => setSelectedDate(e.target.value)}
                        style={{
                            background: 'transparent', border: 'none',
                            color: '#f5e6b8', fontSize: '0.78rem', outline: 'none',
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    />
                </div>

                <div style={{ width: 1, height: 16, background: 'rgba(200,168,75,0.15)', flexShrink: 0 }} />

                {/* Link-mode toggle */}
                <button onClick={toggleLinkMode} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 7, border: '1px solid',
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                    background:  linkMode ? 'rgba(249,115,22,0.15)' : 'transparent',
                    borderColor: linkMode ? '#f97316'               : 'rgba(200,168,75,0.2)',
                    color:       linkMode ? '#f97316'               : '#c8a84b',
                    transition: 'all 0.18s', whiteSpace: 'nowrap',
                }}>
                    {linkMode ? <Link2 size={12} /> : <Link2Off size={12} />}
                    {linkMode ? 'Lier ON' : 'Mode Lier'}
                </button>

                {/* Refresh */}
                <button onClick={fetchStatuses} disabled={loading} style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: '1px solid rgba(200,168,75,0.18)',
                    borderRadius: 7, cursor: 'pointer', color: '#c8a84b', flexShrink: 0,
                }}>
                    <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                </button>

                <div style={{ width: 1, height: 16, background: 'rgba(200,168,75,0.15)', flexShrink: 0 }} />

                {/* Legend */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {LEGEND.map(({ label, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.65rem', color: '#70718a', whiteSpace: 'nowrap' }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Floating link-mode action bar (bottom) ──────────── */}
            {linkMode && linkedTables.length > 0 && (
                <div style={{
                    position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', gap: 10, alignItems: 'center',
                    background: 'rgba(8,8,14,0.96)',
                    border: '1px solid rgba(249,115,22,0.45)',
                    borderRadius: 12, padding: '10px 18px',
                    zIndex: 30,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 24px rgba(249,115,22,0.15)',
                    whiteSpace: 'nowrap',
                }}>
                    <span style={{ fontSize: '0.78rem', color: '#c8a84b', fontWeight: 600 }}>
                        {linkedTables.length} table{linkedTables.length > 1 ? 's' : ''} sélectionnée{linkedTables.length > 1 ? 's' : ''}
                    </span>

                    <button onClick={clearLinkedTables} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 10px', background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7,
                        color: '#64748b', cursor: 'pointer', fontSize: '0.75rem',
                    }}>
                        <X size={11} /> Annuler
                    </button>

                    <button onClick={handleGroupReserve} style={{
                        padding: '8px 18px', borderRadius: 8,
                        background: 'linear-gradient(135deg,#f97316,#ea580c)',
                        border: 'none', color: '#fff', fontWeight: 700,
                        fontSize: '0.85rem', cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(249,115,22,0.45)',
                    }}>
                        Réserver {linkedTables.length} table{linkedTables.length > 1 ? 's' : ''}
                    </button>
                </div>
            )}

            {/* ── Reservation Modal ───────────────────────────────── */}
            {modalTables && (
                <ReservationModal
                    tables={modalTables}
                    date={selectedDate}
                    onClose={() => { setModalTables(null); clearLinkedTables(); }}
                    onSuccess={fetchStatuses}
                />
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
