'use client';
import { useState } from 'react';
import { X, User, Phone, DollarSign, CreditCard, Banknote, StickyNote } from 'lucide-react';
import api from '@/lib/api';
import { useAppStore, TableStatus } from '@/lib/store';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface Props {
    tables: TableStatus[];   // single or multi (linked)
    date: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ReservationModal({ tables, date, onClose, onSuccess }: Props) {
    const { t } = useTranslation();
    const { linkedTables, clearLinkedTables } = useAppStore();
    const [form, setForm] = useState({
        customer_name: '',
        customer_phone: '',
        total_price: '',
        advance_paid: '',
        payment_method: 'cash',
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    const tableIds = tables.map(t => t.id);
    const tableNums = tables.map(t => t.table_number).join(', ');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customer_name.trim()) { toast.error(t('reservationModal.errors.nameRequired')); return; }
        if (!form.total_price) { toast.error(t('reservationModal.errors.priceRequired')); return; }

        setLoading(true);
        try {
            await api.post('/reservations/', {
                table_ids: tableIds,
                customer_name: form.customer_name.trim(),
                customer_phone: form.customer_phone,
                total_price: parseFloat(form.total_price),
                advance_paid: parseFloat(form.advance_paid || '0'),
                payment_method: form.payment_method,
                date_reservation: date,
                notes: form.notes,
            });
            toast.success(t('reservationModal.success'));
            clearLinkedTables();
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || t('reservationModal.errors.create'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <div>
                        <h2 style={s.title}>{t('reservationModal.title')}</h2>
                        <p style={s.subtitle}>
                            {tables.length > 1 ? t('reservationModal.tablesPlural') : t('reservationModal.tables')}&nbsp;
                            <span style={{ color: '#f5e6b8', fontWeight: 700 }}>{tableNums}</span>
                            &nbsp;·&nbsp;
                            <span style={{ color: 'var(--text-muted)' }}>{new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </p>
                    </div>
                    <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} style={s.form}>
                    {/* Client name */}
                    <Field icon={<User size={14} />} label={t('reservationModal.fields.clientName')}>
                        <input required
                            placeholder={t('reservationModal.placeholders.clientName')}
                            value={form.customer_name}
                            onChange={e => setForm({ ...form, customer_name: e.target.value })}
                            style={s.input}
                        />
                    </Field>

                    {/* Phone */}
                    <Field icon={<Phone size={14} />} label={t('reservationModal.fields.phone')}>
                        <input
                            type="tel"
                            placeholder={t('reservationModal.placeholders.phone')}
                            value={form.customer_phone}
                            onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                            style={s.input}
                        />
                    </Field>

                    {/* Price row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field icon={<DollarSign size={14} />} label={t('reservationModal.fields.totalPrice')}>
                            <input required type="number" min="0" step="0.01"
                                placeholder="0.00"
                                value={form.total_price}
                                onChange={e => setForm({ ...form, total_price: e.target.value })}
                                style={s.input}
                            />
                        </Field>
                        <Field icon={<DollarSign size={14} />} label={t('reservationModal.fields.advance')}>
                            <input type="number" min="0" step="0.01"
                                placeholder="0.00"
                                value={form.advance_paid}
                                onChange={e => setForm({ ...form, advance_paid: e.target.value })}
                                style={s.input}
                            />
                        </Field>
                    </div>

                    {/* Payment method */}
                    <Field icon={<CreditCard size={14} />} label={t('reservationModal.fields.paymentMethod')}>
                        <div style={s.payRow}>
                            {(['cash', 'tpe'] as const).map(m => (
                                <button key={m} type="button"
                                    onClick={() => setForm({ ...form, payment_method: m })}
                                    style={{
                                        ...s.payBtn,
                                        background: form.payment_method === m ? (m === 'cash' ? 'rgba(34,197,94,0.15)' : 'rgba(246,188,89,0.15)') : 'rgba(10,10,16,0.6)',
                                        borderColor: form.payment_method === m ? (m === 'cash' ? '#22c55e' : '#f6bc59') : 'rgba(246,188,89,0.15)',
                                        color: form.payment_method === m ? (m === 'cash' ? '#22c55e' : '#f6bc59') : '#94a3b8',
                                        boxShadow: form.payment_method === m ? (m === 'cash' ? '0 0 12px rgba(34,197,94,0.2)' : '0 0 12px rgba(246,188,89,0.2)') : 'none',
                                    }}>
                                    {m === 'cash' ? <Banknote size={14} /> : <CreditCard size={14} />}
                                    {m === 'cash' ? t('reservationModal.payment.cash') : t('reservationModal.payment.tpe')}
                                </button>
                            ))}
                        </div>
                    </Field>

                    {/* Notes */}
                    <Field icon={<StickyNote size={14} />} label={t('reservationModal.fields.notes')}>
                        <textarea rows={2}
                            placeholder={t('reservationModal.placeholders.notes')}
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            style={{ ...s.input, resize: 'none' }}
                        />
                    </Field>

                    {/* Balance */}
                    {form.total_price && (
                        <div style={s.balanceRow}>
                            <span style={{ color: '#c8a84b', fontSize: '0.85rem', fontWeight: 600 }}>{t('reservationModal.balance')}</span>
                            <span style={{ color: parseFloat(form.advance_paid || '0') >= parseFloat(form.total_price) ? '#22c55e' : '#f97316', fontWeight: 800, fontSize: '1.05rem', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                                {(parseFloat(form.total_price) - parseFloat(form.advance_paid || '0')).toFixed(2)} DH
                            </span>
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={s.footer}>
                        <button type="button" onClick={onClose} style={s.cancelBtn}>{t('reservationModal.actions.cancel')}</button>
                        <button type="submit" disabled={loading} style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}>
                            {loading ? t('reservationModal.actions.saving') : t('reservationModal.actions.confirm')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 500, color: '#f5e6b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ color: '#c8a84b' }}>{icon}</span>
                {label}
            </label>
            {children}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    },
    modal: {
        background: 'rgba(15,15,20,0.95)', borderRadius: 16, border: '1px solid rgba(246,188,89,0.25)',
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 30px 60px rgba(0,0,0,0.8), 0 0 120px rgba(246,188,89,0.1)',
    },
    header: {
        padding: '24px 28px', borderBottom: '1px solid rgba(246,188,89,0.1)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(246,188,89,0.06), transparent)',
    },
    title: { fontSize: '1.25rem', fontWeight: 800, color: '#f5e6b8', marginBottom: 6, fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.05em' },
    subtitle: { fontSize: '0.8rem', color: 'var(--text-muted)' },
    closeBtn: {
        background: 'rgba(246,188,89,0.08)', border: '1px solid rgba(246,188,89,0.2)',
        borderRadius: 10, padding: 8, cursor: 'pointer', color: '#c8a84b', display: 'flex',
        transition: 'all 0.2s',
    },
    form: { padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 },
    input: {
        background: 'rgba(10,10,16,0.8)', border: '1px solid rgba(246,188,89,0.15)',
        borderRadius: 12, color: '#f5e6b8', fontSize: '0.9rem', padding: '12px 14px', outline: 'none', width: '100%',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)', transition: 'all 0.2s ease',
    },
    payRow: { display: 'flex', gap: 10 },
    payBtn: {
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '12px', border: '1px solid', borderRadius: 12, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    balanceRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 18px', background: 'rgba(246,188,89,0.05)', borderRadius: 12,
        border: '1px dashed rgba(246,188,89,0.25)',
    },
    footer: { display: 'flex', gap: 12, marginTop: 8 },
    cancelBtn: {
        flex: 1, padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
        transition: 'all 0.2s',
    },
    submitBtn: {
        flex: 2, padding: '14px', background: 'linear-gradient(135deg, rgba(200,168,75,0.9), rgba(160,120,40,0.9))',
        border: '1px solid rgba(246,188,89,0.4)', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: '0.95rem',
        cursor: 'pointer', boxShadow: '0 4px 20px rgba(200,168,75,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em',
        transition: 'all 0.2s', textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    },
};
