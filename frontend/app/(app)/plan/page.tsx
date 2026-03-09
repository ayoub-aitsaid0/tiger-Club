'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useAppStore, TableStatus } from '@/lib/store';
import ReservationModal from '@/components/ReservationModal';
import toast from 'react-hot-toast';
import { Link2, Link2Off, RefreshCw, Calendar } from 'lucide-react';

// Konva must be loaded client-side only
const FloorMap = dynamic(() => import('@/components/FloorMap'), { ssr: false });

const LEGEND = [
    { label: 'Libre', color: '#22c55e' },
    { label: 'Réservé', color: '#ef4444' },
    { label: 'Occupé', color: '#eab308' },
    { label: 'VIP', color: '#a855f7' },
    { label: 'Scène', color: '#6dbfa0' },
    { label: 'Simple', color: '#f97316' },
];

export default function PlanPage() {
    const { selectedDate, setSelectedDate, tableStatuses, setTableStatuses, linkMode, toggleLinkMode, linkedTables, clearLinkedTables } = useAppStore();
    const [loading, setLoading] = useState(false);
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
            toast.error(`Table ${table.table_number} est déjà ${table.status === 'reserved' ? 'réservée' : 'occupée'}`);
            return;
        }
        setModalTables([table]);
    };

    const handleGroupReserve = () => {
        const selected = tableStatuses.filter(t => linkedTables.includes(t.id));
        const nonFree = selected.filter(t => t.status !== 'free');
        if (nonFree.length > 0) {
            toast.error(`Table(s) ${nonFree.map(t => t.table_number).join(', ')} non disponible(s)`);
            return;
        }
        if (selected.length === 0) { toast.error('Sélectionnez au moins une table'); return; }
        setModalTables(selected);
    };

    return (
        <div style={{ display: 'flex', height: '100%', background: 'var(--bg-primary)', overflow: 'hidden' }}>
            {/* Left Part: FloorMap */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 10 }}>
                {tableStatuses.length > 0 ? (
                    <FloorMap tables={tableStatuses} onTableClick={handleTableClick} />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                        {loading ? 'Chargement du plan...' : 'Aucune donnée disponible'}
                    </div>
                )}
            </div>

            {/* Right Sidebar: Controls */}
            <div style={{
                width: 300,
                borderLeft: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 20px',
                gap: 28,
                overflowY: 'auto'
            }}>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: 4 }}>Plan de Salle</h1>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gérez vos réservations en temps réel</p>
                </div>

                {/* Date Picker Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date de Réservation</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px' }}>
                        <Calendar size={18} color="#f97316" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', width: '100%' }}
                        />
                    </div>
                </div>

                {/* Actions Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</label>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={toggleLinkMode} style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '12px', borderRadius: 12, border: '1px solid', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                            background: linkMode ? 'rgba(249,115,22,0.1)' : 'var(--bg-card)',
                            borderColor: linkMode ? '#f97316' : 'var(--border)',
                            color: linkMode ? '#f97316' : 'var(--text-primary)',
                        }}>
                            {linkMode ? <Link2 size={16} /> : <Link2Off size={16} />}
                            {linkMode ? 'Lier Activé' : 'Mode Lier'}
                        </button>

                        <button onClick={fetchStatuses} disabled={loading} style={{
                            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', color: 'var(--text-secondary)'
                        }}>
                            <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        </button>
                    </div>

                    {linkMode && linkedTables.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                            <button onClick={handleGroupReserve} style={{
                                width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#f97316,#ea580c)',
                                border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
                            }}>
                                Réserver {linkedTables.length} table{linkedTables.length > 1 ? 's' : ''}
                            </button>
                            <button onClick={clearLinkedTables} style={{
                                width: '100%', padding: '10px', borderRadius: 12, background: 'transparent',
                                border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem'
                            }}>
                                Annuler la sélection
                            </button>
                        </div>
                    )}
                </div>

                {/* Legend Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Légende</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {LEGEND.map(({ label, color }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 12, height: 12, borderRadius: 4, background: color, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Reservation modal */}
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
