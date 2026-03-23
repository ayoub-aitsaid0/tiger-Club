'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAppStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Calendar, Search, X } from 'lucide-react';

interface Reservation {
    id: number;
    table_ids: number[];
    table_numbers: string[];
    customer_name: string;
    customer_phone: string;
    total_price: number;
    advance_paid: number;
    payment_method: string;
    date_reservation: string;
    status: string;
    notes: string;
    created_by_user_id: number;
    created_by_username: string;
    created_at: string;
}

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
    reserved: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Réservé' },
    occupied: { color: '#eab308', bg: 'rgba(234,179,8,0.1)', label: 'Occupé' },
    cancelled: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Annulé' },
};

export default function ReservationsPage() {
    const { user } = useAppStore();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState('');
    const [search, setSearch] = useState('');
    const [editRes, setEditRes] = useState<Reservation | null>(null);
    const [editForm, setEditForm] = useState<Partial<Reservation>>({});

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFilter) params.append('date', dateFilter);
            const { data } = await api.get('/reservations/?' + params);
            setReservations(data);
        } catch { toast.error('Erreur chargement réservations'); }
        finally { setLoading(false); }
    }, [dateFilter]);

    useEffect(() => { fetchReservations(); }, [fetchReservations]);

    const filtered = reservations.filter(r =>
        r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        r.customer_phone?.includes(search)
    );

    const handleSaveEdit = async () => {
        if (!editRes) return;
        try {
            await api.patch(`/reservations/${editRes.id}`, editForm);
            toast.success('Réservation mise à jour');
            setEditRes(null);
            fetchReservations();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Erreur'); }
    };

    const handleCancel = async (id: number) => {
        if (!confirm('Annuler cette réservation ?')) return;
        try {
            await api.delete(`/reservations/${id}`);
            toast.success('Réservation annulée');
            fetchReservations();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Erreur'); }
    };

    const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', padding: '12px 14px', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s' };

    return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflow: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <h1 style={{ fontWeight: 700, fontSize: '1.2rem', flex: 1 }}>📋 Réservations</h1>

                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 12px', minWidth: 200 }}>
                    <Search size={14} color="#64748b" />
                    <input
                        placeholder="Nom ou téléphone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%' }}
                    />
                    {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={12} /></button>}
                </div>

                {/* Date filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 12px' }}>
                    <Calendar size={14} color="#f97316" />
                    <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                    {dateFilter && <button onClick={() => setDateFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={12} /></button>}
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {[
                    { label: 'Total', value: filtered.length, color: '#f97316' },
                    { label: 'Réservées', value: filtered.filter(r => r.status === 'reserved').length, color: '#ef4444' },
                    { label: 'CA Total', value: filtered.reduce((s, r) => s + r.total_price, 0).toFixed(0) + ' DH', color: '#22c55e' },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Tables', 'Client', 'Téléphone', 'Date', 'Prix', 'Avance', 'Paiement', 'Statut', 'Caissier', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Aucune réservation trouvée</td></tr>
                            ) : filtered.map(r => {
                                const st = STATUS_STYLE[r.status] || STATUS_STYLE.cancelled;
                                return (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <td style={{ padding: '11px 14px', fontWeight: 600, color: '#f97316' }}>{r.table_numbers?.join(', ') || r.table_ids?.join(', ')}</td>
                                        <td style={{ padding: '11px 14px', fontWeight: 500 }}>{r.customer_name}</td>
                                        <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{r.customer_phone || '—'}</td>
                                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                            {new Date(r.date_reservation + 'T12:00:00').toLocaleDateString('fr-FR')}
                                        </td>
                                        <td style={{ padding: '11px 14px', fontWeight: 600, color: '#22c55e' }}>{r.total_price} DH</td>
                                        <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{r.advance_paid} DH</td>
                                        <td style={{ padding: '11px 14px' }}>
                                            <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, background: r.payment_method === 'cash' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)', color: r.payment_method === 'cash' ? '#22c55e' : '#818cf8' }}>
                                                {r.payment_method === 'cash' ? 'Espèces' : 'TPE'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '11px 14px' }}>
                                            <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, background: st.bg, color: st.color }}>{st.label}</span>
                                        </td>
                                        <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{r.created_by_username}</td>
                                        {(() => {
                                            const canEdit = user?.role === 'admin' || r.created_by_user_id === user?.id;
                                            return (
                                                <td style={{ padding: '11px 14px' }}>
                                                    {canEdit && (
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <button onClick={() => { setEditRes(r); setEditForm(r); }}
                                                                style={{ padding: '4px 10px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 6, color: '#f97316', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                                Modifier
                                                            </button>
                                                            {r.status !== 'cancelled' && (
                                                                <button onClick={() => handleCancel(r.id)}
                                                                    style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                                    Annuler
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })()}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {editRes && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
                    onClick={e => e.target === e.currentTarget && setEditRes(null)}>
                    <div style={{ background: '#13131c', borderRadius: 16, border: '1px solid rgba(249,115,22,0.25)', padding: 32, width: '100%', maxWidth: 500, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontWeight: 800, fontSize: '1.25rem' }}>Modifier Réservation #{editRes.id}</h3>
                            <button onClick={() => setEditRes(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Nom du Client</label>
                                <input style={inputStyle} value={editForm.customer_name || ''}
                                    onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Téléphone</label>
                                <input style={inputStyle} value={editForm.customer_phone || ''}
                                    onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Statut</label>
                                <select style={inputStyle} value={editForm.status || ''}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                    <option value="reserved">Réservé</option>
                                    <option value="occupied">Occupé</option>
                                    <option value="cancelled">Annulé</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Prix Total (DH)</label>
                                <input type="number" style={inputStyle} value={editForm.total_price || 0}
                                    onChange={e => setEditForm({ ...editForm, total_price: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Avance (DH)</label>
                                <input type="number" style={inputStyle} value={editForm.advance_paid || 0}
                                    onChange={e => setEditForm({ ...editForm, advance_paid: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Mode Paiement</label>
                                <select style={inputStyle} value={editForm.payment_method || ''}
                                    onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })}>
                                    <option value="cash">Espèces</option>
                                    <option value="tpe">TPE</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Notes</label>
                                <textarea style={{ ...inputStyle, height: 80, resize: 'none' }} value={editForm.notes || ''}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setEditRes(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                            <button onClick={handleSaveEdit} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
