'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAppStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Calendar, Search, X, Edit2, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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
    operator_name: string | null;
    created_by_user_id: number;
    created_by_username: string;
    created_at: string;
}

const getStatusStyles = (t: any): Record<string, { color: string; bg: string; label: string }> => ({
    reserved: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: t('reservations.status.reserved') },
    occupied: { color: '#eab308', bg: 'rgba(234,179,8,0.1)', label: t('reservations.status.occupied') },
    cancelled: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: t('reservations.status.cancelled') },
});

export default function ReservationsPage() {
    const { t } = useTranslation();
    const STATUS_STYLE = getStatusStyles(t);
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
        } catch { toast.error(t('reservations.messages.loadError')); }
        finally { setLoading(false); }
    }, [dateFilter, t]);

    useEffect(() => { fetchReservations(); }, [fetchReservations]);

    const filtered = reservations.filter(r =>
        r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        r.customer_phone?.includes(search)
    );

    const handleSaveEdit = async () => {
        if (!editRes) return;
        try {
            await api.patch(`/reservations/${editRes.id}`, editForm);
            toast.success(t('reservations.messages.updateSuccess'));
            setEditRes(null);
            fetchReservations();
        } catch (err: any) { toast.error(err.response?.data?.error || t('reservations.messages.error')); }
    };

    const handleCancel = async (id: number) => {
        if (!confirm(t('reservations.prompts.cancel'))) return;
        try {
            await api.delete(`/reservations/${id}`);
            toast.success(t('reservations.messages.cancelSuccess'));
            fetchReservations();
        } catch (err: any) { toast.error(err.response?.data?.error || t('reservations.messages.error')); }
    };

    const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg-secondary)', border: '1px solid rgba(246,188,89,0.2)', borderRadius: 10, color: '#fff', padding: '12px 14px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', WebkitAppearance: 'none' };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{ padding: '32px 32px 100px', display: 'flex', flexDirection: 'column', gap: 32, height: '100%', overflow: 'auto' }}
        >
            {/* Header & Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 className="luxury-text" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>
                    <Sparkles size={28} color="var(--gold)" /> 
                    {t('reservations.title')}
                </h1>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: '1 1 300px', justifyItems: 'flex-end', justifyContent: 'flex-end' }}>
                    {/* Search */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid rgba(246,188,89,0.15)', borderRadius: 12, padding: '10px 14px', flex: '1 1 200px', maxWidth: 350 }}>
                        <Search size={16} color="#F6BC59" opacity={0.8} />
                        <input
                            placeholder={t('reservations.searchPlaceholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%', WebkitAppearance: 'none' }}
                        />
                        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={14} /></button>}
                    </div>

                    {/* Date filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid rgba(246,188,89,0.15)', borderRadius: 12, padding: '10px 14px', flex: '0 1 180px' }}>
                        <Calendar size={16} color="#F6BC59" opacity={0.8} />
                        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', width: '100%' }} />
                        {dateFilter && <button onClick={() => setDateFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={14} /></button>}
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
                {[
                    { label: t('reservations.stats.total'), value: filtered.length, color: 'var(--gold)', bg: 'rgba(246,188,89,0.05)' },
                    { label: t('reservations.stats.reserved'), value: filtered.filter(r => r.status === 'reserved').length, color: 'var(--red)', bg: 'rgba(239,68,68,0.05)' },
                    ...(user?.role === 'admin' ? [{ label: t('reservations.stats.revenue'), value: filtered.reduce((s, r) => s + r.total_price, 0).toLocaleString('fr-FR') + ' DH', color: 'var(--green)', bg: 'rgba(34,197,94,0.05)' }] : []),
                ].map(({ label, value, color, bg }, idx) => (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        key={label} 
                        className="glass-panel" 
                        style={{ padding: '20px 24px', border: `1px solid ${color}30`, position: 'relative', overflow: 'hidden' }}
                    >
                        <div style={{ position: 'absolute', top: -40, right: -40, width: 100, height: 100, background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
                        <div className="luxury-text" style={{ fontSize: '1.8rem', background: `linear-gradient(135deg, #fff, ${color})`, WebkitBackgroundClip: 'text', textShadow: `0 4px 20px ${color}30` }}>{value}</div>
                    </motion.div>
                ))}
            </div>

            {/* ── Mobile Layout (Cards) ── */}
            <div className="mobile-only" style={{ flexDirection: 'column', gap: 20, paddingBottom: 20 }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>{t('reservations.loading')}</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>{t('reservations.noData')}</div>
                ) : filtered.map((r, idx) => {
                    const st = STATUS_STYLE[r.status] || STATUS_STYLE.cancelled;
                    const canEdit = user?.role === 'admin' || r.created_by_user_id === user?.id;
                    return (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15, delay: Math.min(idx * 0.03, 0.3) }}
                            key={r.id} 
                            className="glass-panel"
                            style={{
                                padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
                                border: `1px solid ${st.color}30`,
                                position: 'relative', overflow: 'hidden'
                            }}
                        >
                            <div style={{ position: 'absolute', top: -60, right: -60, width: 150, height: 150, background: `radial-gradient(circle, ${st.color}15 0%, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#fff', lineHeight: 1.2 }}>{r.customer_name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>{r.customer_phone || t('reservations.noPhone')} • {new Date(r.date_reservation + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                                    {(r.operator_name || r.created_by_username) && (
                                        <div style={{ fontSize: '0.75rem', marginTop: 3, color: r.operator_name ? '#c8a84b' : 'var(--text-muted)', fontWeight: r.operator_name ? 600 : 400 }}>
                                            {r.operator_name ?? r.created_by_username}
                                        </div>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: st.bg, color: st.color, border: `1px solid ${st.color}40`, boxShadow: `0 0 10px ${st.color}15`, textTransform: 'uppercase' }}>
                                    {st.label}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ background: 'rgba(246,188,89,0.1)', border: '1px solid rgba(246,188,89,0.25)', padding: '6px 12px', borderRadius: 8, color: '#F6BC59', fontWeight: 700, fontSize: '0.85rem' }}>
                                    {t('reservations.table')} {r.table_numbers?.join(',') || r.table_ids?.join(',')}
                                </div>
                                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '6px 12px', borderRadius: 8, color: '#22c55e', fontWeight: 700, fontSize: '0.85rem' }}>
                                    {r.total_price.toLocaleString('fr-FR')} DH
                                </div>
                                {r.advance_paid > 0 && (
                                    <div style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
                                        {t('reservations.advance')}: {r.advance_paid}
                                    </div>
                                )}
                            </div>

                            {canEdit && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 4, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button onClick={() => { setEditRes(r); setEditForm(r); }} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}>{t('reservations.actions.edit')}</button>
                                    {r.status !== 'cancelled' && (
                                        <button onClick={() => handleCancel(r.id)} style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}>{t('reservations.actions.cancel')}</button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Desktop Layout (Table) ── */}
            <motion.div 
                className="desktop-only glass-panel" 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1, overflow: 'hidden' }}
            >
                <div style={{ overflowX: 'auto', height: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 1000 }}>
                        <thead style={{ background: '#0A0A10', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                {[
                                    t('reservations.tableHeaders.tables'), t('reservations.tableHeaders.client'), t('reservations.tableHeaders.phone'), t('reservations.tableHeaders.date'),
                                    t('reservations.tableHeaders.price'), t('reservations.tableHeaders.advance'), t('reservations.tableHeaders.payment'),
                                    t('reservations.tableHeaders.status'), t('reservations.tableHeaders.cashier'), t('reservations.tableHeaders.actions')
                                ].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(246,188,89,0.1)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>{t('reservations.loading')}</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={10} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>{t('reservations.noData')}</td></tr>
                            ) : filtered.map(r => {
                                const st = STATUS_STYLE[r.status] || STATUS_STYLE.cancelled;
                                return (
                                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', background: 'transparent' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(246,188,89,0.03)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#F6BC59' }}>{r.table_numbers?.join(', ') || r.table_ids?.join(', ')}</td>
                                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#fff' }}>{r.customer_name}</td>
                                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{r.customer_phone || '—'}</td>
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                            {new Date(r.date_reservation + 'T12:00:00').toLocaleDateString('fr-FR')}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#22c55e' }}>{r.total_price.toLocaleString('fr-FR')} DH</td>
                                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{r.advance_paid.toLocaleString('fr-FR')} DH</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: r.payment_method === 'cash' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)', color: r.payment_method === 'cash' ? '#22c55e' : '#818cf8', border: `1px solid ${r.payment_method === 'cash' ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)'}` }}>
                                                {r.payment_method === 'cash' ? t('reservations.payment.cash') : t('reservations.payment.tpe')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: st.bg, color: st.color, border: `1px solid ${st.color}30`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{st.label}</span>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {r.operator_name
                                                ? <span style={{ color: '#f5e6b8', fontWeight: 600 }}>{r.operator_name}</span>
                                                : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>{r.created_by_username}</span>
                                            }
                                        </td>
                                        {(() => {
                                            const canEdit = user?.role === 'admin' || r.created_by_user_id === user?.id;
                                            return (
                                                <td style={{ padding: '14px 16px' }}>
                                                    {canEdit && (
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button onClick={() => { setEditRes(r); setEditForm(r); }}
                                                                style={{ padding: '6px 12px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, color: '#f97316', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}>
                                                                {t('reservations.actions.edit')}
                                                            </button>
                                                            {r.status !== 'cancelled' && (
                                                                <button onClick={() => handleCancel(r.id)}
                                                                    style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}>
                                                                    {t('reservations.actions.cancel')}
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
            </motion.div>

            {/* ── Edit Modal (Bottom Sheet on Mobile, Centered on Desktop) ── */}
            {editRes && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,4,6,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
                    onClick={e => e.target === e.currentTarget && setEditRes(null)}>
                    
                    <div style={{ 
                        background: '#13131C', borderRadius: 20, 
                        border: '1px solid rgba(246,188,89,0.2)', 
                        padding: '24px 32px', width: '100%', maxWidth: 540, 
                        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
                        maxHeight: '90dvh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h3 style={{ fontWeight: 800, fontSize: '1.4rem', color: '#fff', margin: 0 }}>{t('reservations.modal.title', { id: editRes?.id })}</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Client: {editRes?.customer_name}</p>
                            </div>
                            <button onClick={() => setEditRes(null)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>{t('reservations.modal.clientName')}</label>
                                <input style={inputStyle} value={editForm.customer_name || ''}
                                    onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>{t('reservations.modal.phone')}</label>
                                <input style={inputStyle} value={editForm.customer_phone || ''}
                                    onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>{t('reservations.modal.status')}</label>
                                <select style={inputStyle} value={editForm.status || ''}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                    <option value="reserved">{t('reservations.status.reserved')}</option>
                                    <option value="occupied">{t('reservations.status.occupied')}</option>
                                    <option value="cancelled">{t('reservations.status.cancelled')}</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>{t('reservations.modal.totalPrice')}</label>
                                <input type="number" style={inputStyle} value={editForm.total_price || 0}
                                    onChange={e => setEditForm({ ...editForm, total_price: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label style={labelStyle}>{t('reservations.modal.advance')}</label>
                                <input type="number" style={inputStyle} value={editForm.advance_paid || 0}
                                    onChange={e => setEditForm({ ...editForm, advance_paid: Number(e.target.value) })} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>{t('reservations.modal.paymentMethod')}</label>
                                <select style={inputStyle} value={editForm.payment_method || ''}
                                    onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })}>
                                    <option value="cash">{t('reservations.payment.cash')}</option>
                                    <option value="tpe">{t('reservations.payment.tpe')}</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>{t('reservations.modal.notes')}</label>
                                <textarea style={{ ...inputStyle, height: 100, resize: 'none' }} value={editForm.notes || ''}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setEditRes(null)} style={{ flex: 1, padding: '14px', background: 'var(--bg-secondary)', border: 'none', borderRadius: 12, color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>{t('reservations.actions.cancel')}</button>
                            <button onClick={handleSaveEdit} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(249,115,22,0.3)', fontSize: '0.95rem' }}>{t('reservations.actions.save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
