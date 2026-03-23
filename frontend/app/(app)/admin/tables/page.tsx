'use client';
import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Move, Check, X, RefreshCw, MousePointerClick, Info } from 'lucide-react';
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
    const [tables, setTables]       = useState<AdminTable[]>([]);
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [selectedTable, setSelectedTable] = useState<AdminTable | null>(null);
    const [placementMode, setPlacementMode] = useState(false);

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
            toast.error('Impossible de charger les tables');
        } finally {
            setLoading(false);
        }
    }, []);

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
            toast.error('Erreur lors de la sauvegarde de la position');
            fetchTables(); // revert optimistic update
        } finally {
            setSaving(false);
        }
    };

    /** Called when admin clicks on the canvas in placement mode */
    const handlePlaceTable = async (x: number, y: number) => {
        if (!newForm.table_number.trim()) {
            toast.error('Veuillez saisir un numéro de table');
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
            toast.success(`Table "${data.table_number}" créée`);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Erreur lors de la création');
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
            toast.success('Table mise à jour');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Erreur mise à jour');
        }
    };

    /** Delete selected table */
    const handleDeleteTable = async () => {
        if (!selectedTable) return;
        if (!confirm(`Supprimer la table "${selectedTable.table_number}" ?\nCette action est irréversible.`)) return;
        try {
            await api.delete(`/tables/${selectedTable.id}`);
            setTables(prev => prev.filter(t => t.id !== selectedTable.id));
            setSelectedTable(null);
            setEditForm(null);
            toast.success('Table supprimée');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Impossible de supprimer (réservations actives ?)');
        }
    };

    const newTableDraft: NewTableDraft = {
        table_number: newForm.table_number,
        zone_type:    newForm.zone_type,
        w:            newForm.w,
        h:            newForm.h,
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{
            height: '100vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', background: '#08080e',
        }}>

            {/* ── Top bar ──────────────────────────────────────────────── */}
            <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 18px',
                background: 'rgba(8,8,14,0.98)',
                borderBottom: '1px solid rgba(200,168,75,0.18)',
                zIndex: 20,
            }}>
                <span style={{
                    fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.12em',
                    background: 'linear-gradient(135deg,#f5e6b8,#c8a84b)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    whiteSpace: 'nowrap',
                }}>
                    ÉDITEUR DE PLAN
                </span>

                <div style={{ width: 1, height: 18, background: 'rgba(200,168,75,0.2)', flexShrink: 0 }} />

                <span style={{ fontSize: '0.72rem', color: '#4a4a5a', whiteSpace: 'nowrap' }}>
                    {tables.length} tables • Glissez pour repositionner
                </span>

                {saving && (
                    <span style={{ fontSize: '0.7rem', color: '#c8a84b', marginLeft: 4 }}>
                        Sauvegarde…
                    </span>
                )}

                <button onClick={fetchTables} style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 13px', background: 'transparent',
                    border: '1px solid rgba(200,168,75,0.22)', borderRadius: 7,
                    color: '#c8a84b', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap',
                }}>
                    <RefreshCw size={12} /> Actualiser
                </button>
            </div>

            {/* ── Body: panel + canvas ─────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* Left panel */}
                <div style={{
                    width: 272, flexShrink: 0, overflowY: 'auto',
                    background: 'rgba(10,10,16,0.98)',
                    borderRight: '1px solid rgba(200,168,75,0.1)',
                    padding: '16px 14px',
                    display: 'flex', flexDirection: 'column', gap: 0,
                }}>

                    {/* ── NEW TABLE ─────────────────────────────────────── */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ ...S.section, color: '#c8a84b' }}>
                            <Plus size={12} /> NOUVELLE TABLE
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                            {/* Numéro */}
                            <div>
                                <label style={S.label}>NUMÉRO</label>
                                <input
                                    style={S.input}
                                    value={newForm.table_number}
                                    onChange={e => setNewForm(f => ({ ...f, table_number: e.target.value }))}
                                    placeholder="ex: 52, VIP5, 08C…"
                                />
                            </div>

                            {/* Zone */}
                            <div>
                                <label style={S.label}>ZONE / COULEUR</label>
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
                                <label style={S.label}>CAPACITÉ</label>
                                <input
                                    type="number" min={1} max={30}
                                    style={S.input}
                                    value={newForm.capacity}
                                    onChange={e => setNewForm(f => ({ ...f, capacity: parseInt(e.target.value) || 4 }))}
                                />
                            </div>

                            {/* Taille */}
                            <div>
                                <label style={S.label}>TAILLE</label>
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
                                        toast.error('Entrez un numéro de table');
                                        return;
                                    }
                                    setPlacementMode(p => !p);
                                    setSelectedTable(null);
                                    setEditForm(null);
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
                                    ? <><X size={13} /> Annuler le placement</>
                                    : <><MousePointerClick size={13} /> Placer sur la carte</>
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
                                        Déplacez le curseur sur le plan et <strong>cliquez</strong> pour
                                        déposer la table à l'emplacement souhaité.
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
                                <Info size={12} /> TABLE SÉLECTIONNÉE
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>

                                {/* Read-only info */}
                                {([
                                    ['Numéro',   selectedTable.table_number],
                                    ['Position', `x = ${selectedTable.coordinates.x}   y = ${selectedTable.coordinates.y}`],
                                    ['Taille',   `${selectedTable.coordinates.w} × ${selectedTable.coordinates.h}`],
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
                                    <label style={S.label}>ZONE</label>
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
                                    <label style={S.label}>CAPACITÉ</label>
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
                                        <Check size={12} /> Mettre à jour
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
                            Cliquez sur une table du plan pour la sélectionner et modifier ses propriétés.
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
                            Chargement du plan…
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
        </div>
    );
}
