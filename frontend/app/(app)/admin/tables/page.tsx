'use client';
import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Move, Check, X, RefreshCw, MousePointerClick, Info, Sparkles, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { AdminTable, NewTableDraft } from '@/components/AdminFloorMap';

const AdminFloorMap = dynamic(() => import('@/components/AdminFloorMap'), { ssr: false });

// ─── Config ───────────────────────────────────────────────────────────────────
const ZONES = ['Orange', 'Teal', 'Grey', 'Purple', 'White'] as const;

const ZONE_LABELS: Record<string, string> = {
    Orange: 'Orange — Principal',
    Teal:   'Teal — Scène / Piste',
    Grey:   'Gris — Stage',
    Purple: 'Violet — VIP',
    White:  'Blanc — Tabourets',
};

const ZONE_COLORS: Record<string, string> = {
    Orange: '#c8a84b', Teal: '#14b8a6',
    Grey: '#94a3b8', Purple: '#a855f7', White: '#d4c090',
};

const SIZE_PRESETS = [
    { label: 'Standard  110 × 109', w: 110, h: 109 },
    { label: 'Large     131 × 109', w: 131, h: 109 },
    { label: 'VIP        88 × 109', w: 88,  h: 109 },
    { label: 'Tabouret   56 × 63',  w: 56,  h: 63  },
    { label: 'Petite     88 × 91',  w: 88,  h: 91  },
] as const;

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
    input: {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(200,168,75,0.2)',
        borderRadius: 7,
        color: '#f5e6b8',
        padding: '7px 10px',
        fontSize: '0.82rem',
        width: '100%',
        outline: 'none',
    } as React.CSSProperties,

    label: {
        fontSize: '0.68rem',
        color: '#806030',
        marginBottom: 4,
        display: 'block',
        letterSpacing: '0.07em',
        fontWeight: 600,
    } as React.CSSProperties,

    section: {
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminTablesPage() {
    const { t } = useTranslation();
    const [tables, setTables]       = useState<AdminTable[]>([]);
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [selectedTable, setSelectedTable] = useState<AdminTable | null>(null);
    const [placementMode, setPlacementMode] = useState(false);
    const [controlsOpen, setControlsOpen] = useState(false);

    const closeMobileShelf = useCallback(() => {
        setControlsOpen(false);
    }, []);

    // New table form
    const [newForm, setNewForm] = useState({
        table_number: '',
        zone_type: 'Orange' as string,
        capacity: 4,
        w: 110,
        h: 109,
    });

    // Edit form for selected table
    const [editForm, setEditForm] = useState<{
        zone_type: string;
        capacity: number;
    } | null>(null);

    // ── Data ─────────────────────────────────────────────────────────────────
    const fetchTables = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/tables/');
            setTables(data);
        } catch {
            toast.error(t('adminTables.messages.loadError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { fetchTables(); }, [fetchTables]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    /** Called when a table is dragged to a new position */
    const handleTableMove = async (id: number, x: number, y: number) => {
        // Optimistic update
        setTables(prev => prev.map(t =>
            t.id === id ? { ...t, coordinates: { ...t.coordinates, x, y } } : t
        ));
        if (selectedTable?.id === id) {
            setSelectedTable(prev => prev
                ? { ...prev, coordinates: { ...prev.coordinates, x, y } }
                : prev
            );
        }
        setSaving(true);
        try {
            await api.put(`/tables/${id}`, { x, y });
        } catch {
            toast.error(t('adminTables.messages.savePositionError'));
            fetchTables(); // revert optimistic update
        } finally {
            setSaving(false);
        }
    };

    /** Called when admin clicks on the canvas in placement mode */
    const handlePlaceTable = async (x: number, y: number) => {
        if (!newForm.table_number.trim()) {
            toast.error(t('adminTables.messages.numberRequired'));
            return;
        }
        try {
            const { data } = await api.post('/tables/', {
                table_number: newForm.table_number.trim(),
                zone_type:    newForm.zone_type,
                capacity:     newForm.capacity,
                x, y,
                w: newForm.w,
                h: newForm.h,
            });
            setTables(prev => [...prev, data]);
            setPlacementMode(false);
            setNewForm(f => ({ ...f, table_number: '' }));
            toast.success(t('adminTables.messages.createSuccess', { table_number: data.table_number }));
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || t('adminTables.messages.createError'));
        }
    };

    /** Select a table on canvas click */
    const handleTableSelect = (table: AdminTable | null) => {
        setSelectedTable(table);
        setPlacementMode(false);
        setEditForm(table ? { zone_type: table.zone_type, capacity: table.capacity } : null);
    };

    /** Save edits (zone / capacity) for selected table */
    const handleSaveEdit = async () => {
        if (!selectedTable || !editForm) return;
        try {
            await api.put(`/tables/${selectedTable.id}`, editForm);
            setTables(prev => prev.map(t =>
                t.id === selectedTable.id ? { ...t, ...editForm } : t
            ));
            setSelectedTable(prev => prev ? { ...prev, ...editForm } : prev);
            toast.success(t('adminTables.messages.updateSuccess'));
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || t('adminTables.messages.updateError'));
        }
    };

    /** Delete selected table */
    const handleDeleteTable = async () => {
        if (!selectedTable) return;
        if (!confirm(t('adminTables.messages.deleteConfirm', { table_number: selectedTable.table_number }))) return;
        try {
            await api.delete(`/tables/${selectedTable.id}`);
            setTables(prev => prev.filter(t => t.id !== selectedTable.id));
            setSelectedTable(null);
            setEditForm(null);
            toast.success(t('adminTables.messages.deleteSuccess'));
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || t('adminTables.messages.deleteError'));
        }
    };

    const newTableDraft: NewTableDraft = {
        table_number: newForm.table_number,
        zone_type:    newForm.zone_type,
        w:            newForm.w,
        h:            newForm.h,
    };

    const editorPanel = (
        <>
            {/* ── NEW TABLE ─────────────────────────────────────── */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ ...S.section, color: '#c8a84b' }}>
                    <Plus size={12} /> {t('adminTables.newTable')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                    {/* Numéro */}
                    <div>
                        <label style={S.label}>{t('adminTables.fields.number')}</label>
                        <input
                            style={S.input}
                            value={newForm.table_number}
                            onChange={e => setNewForm(f => ({ ...f, table_number: e.target.value }))}
                            placeholder={t('adminTables.placeholders.number')}
                        />
                    </div>

                    {/* Zone */}
                    <div>
                        <label style={S.label}>{t('adminTables.fields.zone')}</label>
                        <select
                            style={{ ...S.input, cursor: 'pointer' }}
                            value={newForm.zone_type}
                            onChange={e => setNewForm(f => ({ ...f, zone_type: e.target.value }))}
                        >
                            {ZONES.map(z => (
                                <option key={z} value={z}>{ZONE_LABELS[z]}</option>
                            ))}
                        </select>
                        <div style={{
                            marginTop: 5, height: 3, borderRadius: 2,
                            background: ZONE_COLORS[newForm.zone_type],
                            boxShadow: `0 0 6px ${ZONE_COLORS[newForm.zone_type]}70`,
                        }} />
                    </div>

                    {/* Capacité */}
                    <div>
                        <label style={S.label}>{t('adminTables.fields.capacity')}</label>
                        <input
                            type="number" min={1} max={30}
                            style={S.input}
                            value={newForm.capacity}
                            onChange={e => setNewForm(f => ({ ...f, capacity: parseInt(e.target.value) || 4 }))}
                        />
                    </div>

                    {/* Taille */}
                    <div>
                        <label style={S.label}>{t('adminTables.fields.size')}</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {SIZE_PRESETS.map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => setNewForm(f => ({ ...f, w: p.w, h: p.h }))}
                                    style={{
                                        padding: '5px 9px',
                                        background: newForm.w === p.w && newForm.h === p.h
                                            ? 'rgba(200,168,75,0.12)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: newForm.w === p.w && newForm.h === p.h
                                            ? 'rgba(200,168,75,0.4)' : 'rgba(200,168,75,0.08)',
                                        borderRadius: 5, color: '#c8a84b',
                                        fontSize: '0.7rem', cursor: 'pointer',
                                        textAlign: 'left', fontFamily: 'monospace',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom W × H */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ ...S.label, marginBottom: 2 }}>L (px)</label>
                                <input
                                    type="number" min={20} max={300}
                                    style={S.input}
                                    value={newForm.w}
                                    onChange={e => setNewForm(f => ({ ...f, w: parseInt(e.target.value) || 100 }))}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ ...S.label, marginBottom: 2 }}>H (px)</label>
                                <input
                                    type="number" min={10} max={200}
                                    style={S.input}
                                    value={newForm.h}
                                    onChange={e => setNewForm(f => ({ ...f, h: parseInt(e.target.value) || 60 }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Placement button */}
                    <button
                        onClick={() => {
                            if (!newForm.table_number.trim()) {
                                toast.error(t('adminTables.messages.enterNumber'));
                                return;
                            }
                            setPlacementMode(p => !p);
                            setSelectedTable(null);
                            setEditForm(null);
                            setControlsOpen(false);
                        }}
                        style={{
                            marginTop: 4,
                            padding: '10px',
                            background: placementMode
                                ? 'rgba(249,115,22,0.15)'
                                : 'rgba(200,168,75,0.07)',
                            border: `1px solid ${placementMode ? '#f97316' : 'rgba(200,168,75,0.25)'}`,
                            borderRadius: 8,
                            cursor: 'pointer',
                            color: placementMode ? '#f97316' : '#c8a84b',
                            fontWeight: 700, fontSize: '0.82rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            transition: 'all 0.18s',
                        }}
                    >
                        {placementMode
                            ? <><X size={13} /> {t('adminTables.actions.cancelPlacement')}</>
                            : <><MousePointerClick size={13} /> {t('adminTables.actions.placeOnMap')}</>
                        }
                    </button>

                    {placementMode && (
                        <div style={{
                            padding: '9px 11px',
                            background: 'rgba(249,115,22,0.06)',
                            border: '1px dashed rgba(249,115,22,0.35)',
                            borderRadius: 7, fontSize: '0.69rem', color: '#f97316', lineHeight: 1.55,
                            display: 'flex', gap: 7,
                        }}>
                            <Move size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>
                                {t('adminTables.instructions.placement')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── SELECTED TABLE ────────────────────────────────── */}
            {selectedTable && editForm ? (
                <div style={{
                    borderTop: '1px solid rgba(200,168,75,0.1)',
                    paddingTop: 16,
                }}>
                    <div style={{ ...S.section, color: '#f97316' }}>
                        <Info size={12} /> {t('adminTables.selectedTable')}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>

                        {/* Read-only info */}
                        {([
                            [t('adminTables.fields.number'),   selectedTable.table_number],
                            [t('adminTables.fields.position'), `x = ${selectedTable.coordinates.x}   y = ${selectedTable.coordinates.y}`],
                            [t('adminTables.fields.size'),   `${selectedTable.coordinates.w} × ${selectedTable.coordinates.h}`],
                        ] as [string, string][]).map(([k, v]) => (
                            <div key={k}>
                                <label style={S.label}>{k}</label>
                                <div style={{
                                    fontSize: '0.8rem', color: '#f5e6b8',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(200,168,75,0.1)',
                                    borderRadius: 6, padding: '6px 10px',
                                    fontFamily: k === 'Position' || k === 'Taille' ? 'monospace' : 'inherit',
                                }}>
                                    {v}
                                </div>
                            </div>
                        ))}

                        {/* Editable: zone */}
                        <div>
                            <label style={S.label}>{t('adminTables.fields.zone')}</label>
                            <select
                                style={{ ...S.input, cursor: 'pointer' }}
                                value={editForm.zone_type}
                                onChange={e => setEditForm(f => f ? { ...f, zone_type: e.target.value } : f)}
                            >
                                {ZONES.map(z => (
                                    <option key={z} value={z}>{ZONE_LABELS[z]}</option>
                                ))}
                            </select>
                            <div style={{
                                marginTop: 5, height: 3, borderRadius: 2,
                                background: ZONE_COLORS[editForm.zone_type],
                            }} />
                        </div>

                        {/* Editable: capacity */}
                        <div>
                            <label style={S.label}>{t('adminTables.fields.capacity')}</label>
                            <input
                                type="number" min={1} max={30}
                                style={S.input}
                                value={editForm.capacity}
                                onChange={e => setEditForm(f => f ? { ...f, capacity: parseInt(e.target.value) || 4 } : f)}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
                            <button
                                onClick={handleSaveEdit}
                                style={{
                                    flex: 1, padding: '8px 6px',
                                    background: 'rgba(200,168,75,0.1)',
                                    border: '1px solid rgba(200,168,75,0.28)',
                                    borderRadius: 7, color: '#c8a84b',
                                    fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                }}
                            >
                                <Check size={12} /> {t('adminTables.actions.update')}
                            </button>

                            <button
                                onClick={handleDeleteTable}
                                style={{
                                    padding: '8px 12px',
                                    background: 'rgba(220,38,38,0.08)',
                                    border: '1px solid rgba(220,38,38,0.28)',
                                    borderRadius: 7, color: '#ef4444',
                                    fontSize: '0.77rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 5,
                                }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : !placementMode && (
                <div style={{
                    borderTop: '1px solid rgba(200,168,75,0.08)',
                    paddingTop: 14, marginTop: 4,
                    fontSize: '0.7rem', color: '#3a3a4a', textAlign: 'center', lineHeight: 1.6,
                }}>
                    {t('adminTables.instructions.select')}
                </div>
            )}
        </>
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{
                height: '100vh', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', background: 'var(--bg-primary)'
            }}
        >

            {/* ── Top bar ──────────────────────────────────────────────── */}
            <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 18px',
                background: 'rgba(8,8,14,0.98)',
                borderBottom: '1px solid rgba(200,168,75,0.18)',
                zIndex: 20,
            }}>
                <span className="luxury-text" style={{
                    fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.12em',
                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <Sparkles size={14} color="#f5e6b8" />
                    {t('adminTables.title')}
                </span>

                <div style={{ width: 1, height: 18, background: 'rgba(200,168,75,0.2)', flexShrink: 0 }} />

                <span style={{ fontSize: '0.72rem', color: '#4a4a5a', whiteSpace: 'nowrap' }}>
                    {t('adminTables.subtitle', { count: tables.length })}
                </span>

                {saving && (
                    <span style={{ fontSize: '0.7rem', color: '#c8a84b', marginLeft: 4 }}>
                        {t('adminTables.saving')}
                    </span>
                )}

                <button onClick={fetchTables} style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 13px', background: 'transparent',
                    border: '1px solid rgba(200,168,75,0.22)', borderRadius: 7,
                    color: '#c8a84b', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap',
                }}>
                    <RefreshCw size={12} /> {t('adminTables.refresh')}
                </button>
            </div>

            {/* ── Body: panel + canvas ─────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>

                {/* Left panel */}
                <div className="desktop-only" style={{
                    width: 272, flexShrink: 0, overflowY: 'auto',
                    background: 'rgba(10,10,16,0.98)',
                    borderRight: '1px solid rgba(200,168,75,0.1)',
                    padding: '16px 14px',
                    display: 'flex', flexDirection: 'column', gap: 0,
                }}>
                    {editorPanel}
                </div>

                {/* Mobile shelf */}
                <div className="mobile-only" style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    zIndex: 30, pointerEvents: 'none',
                    flexDirection: 'column', alignItems: 'center',
                }}>
                    <button
                        onClick={() => setControlsOpen((o) => !o)}
                        style={{
                            pointerEvents: 'auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            margin: '0 auto', width: 72, height: 30,
                            background: 'rgba(10,8,14,0.95)',
                            border: '1px solid rgba(246,188,89,0.28)', borderTop: 'none',
                            borderRadius: '0 0 12px 12px', color: '#F6BC59', cursor: 'pointer',
                            boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
                        }}
                    >
                        <SlidersHorizontal size={14} />
                        {controlsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {controlsOpen && (
                        <div style={{
                            pointerEvents: 'auto',
                            position: 'absolute', top: 30, left: 8, right: 8,
                            maxHeight: '58vh', overflowY: 'auto',
                            background: 'rgba(10,10,16,0.96)',
                            border: '1px solid rgba(200,168,75,0.24)',
                            borderRadius: '0 0 14px 14px',
                            padding: '12px 12px 14px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                        }}>
                            {editorPanel}
                        </div>
                    )}
                </div>

                {/* Mobile selected table chip */}
                <div className="mobile-only" style={{
                    position: 'absolute', top: 38, left: 10, right: 10,
                    zIndex: 26, pointerEvents: 'none',
                }}>
                    {!controlsOpen && selectedTable && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                            background: 'rgba(10,10,16,0.92)',
                            border: '1px solid rgba(249,115,22,0.35)', borderRadius: 11,
                            padding: '8px 10px', boxShadow: '0 8px 18px rgba(0,0,0,0.42)',
                            pointerEvents: 'auto',
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ color: '#f97316', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                    {t('adminTables.selectedTable')} #{selectedTable.table_number}
                                </span>
                                <span style={{ color: '#B8A070', fontSize: '0.68rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {t('adminTables.fields.position')}: {selectedTable.coordinates.x}, {selectedTable.coordinates.y} · {selectedTable.coordinates.w}×{selectedTable.coordinates.h}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedTable(null);
                                    setEditForm(null);
                                }}
                                style={{
                                    width: 24, height: 24,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 8, color: '#808090', cursor: 'pointer',
                                }}
                                title={t('adminTables.actions.cancelPlacement')}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile sticky quick actions */}
                <div className="mobile-only" style={{
                    position: 'absolute', left: 10, right: 10, bottom: 12,
                    zIndex: 26, pointerEvents: 'none',
                }}>
                    {!controlsOpen && (
                        <div style={{
                            pointerEvents: 'auto',
                            display: 'flex', gap: 8, alignItems: 'center',
                            background: 'rgba(10,10,16,0.94)',
                            border: '1px solid rgba(246,188,89,0.24)',
                            borderRadius: 12, padding: 8,
                            boxShadow: '0 10px 24px rgba(0,0,0,0.5)',
                        }}>
                            <button
                                onClick={() => {
                                    if (!newForm.table_number.trim()) {
                                        toast.error(t('adminTables.messages.enterNumber'));
                                        setControlsOpen(true);
                                        return;
                                    }
                                    setPlacementMode((p) => !p);
                                    setSelectedTable(null);
                                    setEditForm(null);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 10px',
                                    background: placementMode ? 'rgba(249,115,22,0.15)' : 'rgba(200,168,75,0.10)',
                                    border: `1px solid ${placementMode ? 'rgba(249,115,22,0.55)' : 'rgba(200,168,75,0.35)'}`,
                                    borderRadius: 10,
                                    color: placementMode ? '#f97316' : '#c8a84b',
                                    fontSize: '0.74rem', fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}
                            >
                                {placementMode ? <X size={12} /> : <MousePointerClick size={12} />}
                                {placementMode ? t('adminTables.actions.cancelPlacement') : t('adminTables.actions.placeOnMap')}
                            </button>

                            {selectedTable && editForm && (
                                <>
                                    <button
                                        onClick={handleSaveEdit}
                                        style={{
                                            padding: '10px 12px',
                                            background: 'rgba(200,168,75,0.12)',
                                            border: '1px solid rgba(200,168,75,0.35)',
                                            borderRadius: 10, color: '#c8a84b',
                                            fontSize: '0.74rem', fontWeight: 700,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                        }}
                                    >
                                        <Check size={12} /> {t('adminTables.actions.update')}
                                    </button>

                                    <button
                                        onClick={handleDeleteTable}
                                        style={{
                                            width: 38, height: 38,
                                            background: 'rgba(220,38,38,0.10)',
                                            border: '1px solid rgba(220,38,38,0.35)',
                                            borderRadius: 10, color: '#ef4444',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                        title={t('adminTables.messages.deleteConfirm', { table_number: selectedTable.table_number })}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Canvas */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            height: '100%', color: '#c8a84b', fontSize: '0.9rem',
                        }}>
                            {t('adminTables.loadingMap')}
                        </div>
                    ) : (
                        <AdminFloorMap
                            tables={tables}
                            selectedTableId={selectedTable?.id ?? null}
                            placementMode={placementMode}
                            newTableDraft={newTableDraft}
                            onTableMove={handleTableMove}
                            onTableSelect={handleTableSelect}
                            onPlaceTable={handlePlaceTable}
                            onUserInteract={closeMobileShelf}
                        />
                    )}
                </div>
            </div>

            <style>{`
                select option { background: #1a1a24; color: #f5e6b8; }
                input[type=number] { -moz-appearance: textfield; }
                input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(200,168,75,0.2); border-radius: 4px; }
            `}</style>
        </motion.div>
    );
}
