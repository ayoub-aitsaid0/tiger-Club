'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useAppStore, TableStatus } from '@/lib/store';
import ReservationModal from '@/components/ReservationModal';
import toast from 'react-hot-toast';
import { Link2, Link2Off, RefreshCw, Calendar, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FloorMap = dynamic(() => import('@/components/FloorMap'), { ssr: false });

const getLegend = (t: any) => [
    { label: t('plan.legend.free'), color: '#5ea488', shape: 'circle' },
    { label: t('plan.legend.reserved'), color: '#E83838', shape: 'circle' },
    { label: t('plan.legend.occupied'), color: '#ed610c', shape: 'circle' },
    { label: t('plan.legend.vip'), color: '#a63a96', shape: 'circle' },
];

export default function PlanPage() {
    const { t } = useTranslation();
    const LEGEND = getLegend(t);
    const {
        selectedDate, setSelectedDate,
        tableStatuses, setTableStatuses,
        linkMode, toggleLinkMode,
        linkedTables, clearLinkedTables,
    } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [modalTables, setModalTables] = useState<TableStatus[] | null>(null);

    const fetchStatuses = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/tables/status?date=${selectedDate}`);
            setTableStatuses(data);
        } catch {
            toast.error(t('plan.messages.loadError'));
        } finally {
            setLoading(false);
        }
    }, [selectedDate, setTableStatuses, t]);

    useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

    const handleTableClick = (table: TableStatus) => {
        if (table.status !== 'free') {
            toast.error(
                t('plan.messages.alreadyTaken', { number: table.table_number, status: table.status === 'reserved' ? t('plan.status.reserved') : t('plan.status.occupied') })
            );
            return;
        }
        setModalTables([table]);
    };

    const handleGroupReserve = () => {
        const selected = tableStatuses.filter((t: TableStatus) => linkedTables.includes(t.id));
        const nonFree = selected.filter((t: TableStatus) => t.status !== 'free');
        if (nonFree.length > 0) {
            toast.error(t('plan.messages.tablesNotAvailable', { tables: nonFree.map((t: TableStatus) => t.table_number).join(', ') }));
            return;
        }
        if (selected.length === 0) { toast.error(t('plan.messages.selectAtLeastOne')); return; }
        setModalTables(selected);
    };

    return (
        <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#060608' }}>

            {/* ── MAP (full screen) ───────────────────────────────── */}
            <div style={{ position: 'absolute', inset: 0 }}>
                {tableStatuses.length > 0 ? (
                    <FloorMap tables={tableStatuses} onTableClick={handleTableClick} />
                ) : (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '100%', color: '#F6BC59', fontSize: '0.9rem',
                        letterSpacing: '0.05em', fontFamily: "'Outfit', sans-serif",
                    }}>
                        {loading ? t('plan.loading') : t('plan.noData')}
                    </div>
                )}
            </div>

            {/* ── OVERLAY CONTROL BAR (top) ───────────────────────── */}
            <div style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(10,8,14,0.88)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(246,188,89,0.18)',
                borderRadius: 14,
                padding: '8px 16px',
                zIndex: 20,
                boxShadow: '0 6px 28px rgba(0,0,0,0.6), 0 0 1px rgba(246,188,89,0.15)',
                flexWrap: 'wrap',
                maxWidth: 'calc(100vw - 40px)',
                fontFamily: "'Outfit', sans-serif",
            }}>
                {/* Date picker */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'rgba(246,188,89,0.06)',
                    border: '1px solid rgba(246,188,89,0.15)',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                }}>
                    <Calendar size={13} color="#F6BC59" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e: { target: { value: string } }) => setSelectedDate(e.target.value)}
                        style={{
                            background: 'transparent', border: 'none',
                            color: '#F0E4C0', fontSize: '0.8rem', outline: 'none',
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    />
                </div>

                <div style={{ width: 1, height: 20, background: 'rgba(246,188,89,0.12)', flexShrink: 0 }} />

                {/* Link-mode toggle */}
                <button onClick={toggleLinkMode} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8, border: '1px solid',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    fontFamily: 'inherit',
                    background: linkMode ? 'rgba(246,188,89,0.12)' : 'transparent',
                    borderColor: linkMode ? '#F6BC59' : 'rgba(246,188,89,0.15)',
                    color: linkMode ? '#F6BC59' : '#C8B880',
                    transition: 'all 0.18s', whiteSpace: 'nowrap',
                }}>
                    {linkMode ? <Link2 size={13} /> : <Link2Off size={13} />}
                    {linkMode ? t('plan.linkMode.on') : t('plan.linkMode.off')}
                </button>

                {/* Refresh */}
                <button onClick={fetchStatuses} disabled={loading} style={{
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: '1px solid rgba(246,188,89,0.15)',
                    borderRadius: 8, cursor: 'pointer', color: '#C8B880', flexShrink: 0,
                    transition: 'border-color 0.2s',
                }}>
                    <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                </button>

                <div style={{ width: 1, height: 20, background: 'rgba(246,188,89,0.12)', flexShrink: 0 }} />

                {/* Legend */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {LEGEND.map(({ label, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: color, flexShrink: 0,
                                boxShadow: `0 0 6px ${color}55`,
                            }} />
                            <span style={{
                                fontSize: '0.68rem', color: '#8888A0',
                                whiteSpace: 'nowrap', fontWeight: 500,
                            }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Floating link-mode action bar (bottom) ──────────── */}
            {linkMode && linkedTables.length > 0 && (
                <div style={{
                    position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', gap: 12, alignItems: 'center',
                    background: 'rgba(10,8,14,0.94)',
                    backdropFilter: 'blur(14px)',
                    border: '1px solid rgba(246,188,89,0.35)',
                    borderRadius: 14, padding: '12px 20px',
                    zIndex: 30,
                    boxShadow: '0 10px 36px rgba(0,0,0,0.7), 0 0 20px rgba(246,188,89,0.10)',
                    whiteSpace: 'nowrap',
                    fontFamily: "'Outfit', sans-serif",
                    animation: 'fade-in 0.25s ease-out',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(246,188,89,0.12)',
                        color: '#F6BC59', fontSize: '0.85rem', fontWeight: 800,
                    }}>
                        {linkedTables.length}
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#C8B880', fontWeight: 500 }}>
                        {linkedTables.length > 1 ? t('plan.selectedTablesPlural', { count: '' }) : t('plan.selectedTables', { count: '' })}
                    </span>

                    <button onClick={clearLinkedTables} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '7px 12px', background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8,
                        color: '#8888A0', cursor: 'pointer', fontSize: '0.78rem',
                        fontFamily: 'inherit', transition: 'border-color 0.2s',
                    }}>
                        <X size={12} /> {t('plan.actions.cancel')}
                    </button>

                    <button onClick={handleGroupReserve} style={{
                        padding: '9px 20px', borderRadius: 10,
                        background: 'linear-gradient(135deg, #F6BC59, #D89718)',
                        border: 'none', color: '#0A0806', fontWeight: 700,
                        fontSize: '0.85rem', cursor: 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: '0 4px 18px rgba(246,188,89,0.35)',
                        transition: 'box-shadow 0.2s',
                    }}>
                        {linkedTables.length > 1 ? t('plan.actions.reservePlural', { count: linkedTables.length }) : t('plan.actions.reserve', { count: linkedTables.length })}
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
