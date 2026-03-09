'use client';
import { useState } from 'react';
import { X, User, Phone, DollarSign, CreditCard, Banknote, StickyNote } from 'lucide-react';
import api from '@/lib/api';
import { useAppStore, TableStatus } from '@/lib/store';
import toast from 'react-hot-toast';

interface Props {
    tables: TableStatus[];   // single or multi (linked)
    date: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ReservationModal({ tables, date, onClose, onSuccess }: Props) {
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
        if (!form.customer_name.trim()) { toast.error('Nom client requis'); return; }
        if (!form.total_price) { toast.error('Prix total requis'); return; }

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
            toast.success('Réservation créée avec succès !');
            clearLinkedTables();
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erreur lors de la création');
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
                        <h2 style={s.title}>Nouvelle Réservation</h2>
                        <p style={s.subtitle}>
                            Table{tables.length > 1 ? 's' : ''}&nbsp;
                            <span style={{ color: '#f97316', fontWeight: 700 }}>{tableNums}</span>
                            &nbsp;·&nbsp;
                            <span style={{ color: '#94a3b8' }}>{new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </p>
                    </div>
                    <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} style={s.form}>
                    {/* Client name */}
                    <Field icon={<User size={14} />} label="Nom du client *">
                        <input required
                            placeholder="ex: Mohammed Alami"
                            value={form.customer_name}
                            onChange={e => setForm({ ...form, customer_name: e.target.value })}
                            style={s.input}
                        />
                    </Field>

                    {/* Phone */}
                    <Field icon={<Phone size={14} />} label="Téléphone">
                        <input
                            type="tel"
                            placeholder="ex: 06 12 34 56 78"
                            value={form.customer_phone}
                            onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                            style={s.input}
                        />
                    </Field>

                    {/* Price row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field icon={<DollarSign size={14} />} label="Prix total (DH) *">
                            <input required type="number" min="0" step="0.01"
                                placeholder="0.00"
                                value={form.total_price}
                                onChange={e => setForm({ ...form, total_price: e.target.value })}
                                style={s.input}
                            />
                        </Field>
                        <Field icon={<DollarSign size={14} />} label="Avance payée (DH)">
                            <input type="number" min="0" step="0.01"
                                placeholder="0.00"
                                value={form.advance_paid}
                                onChange={e => setForm({ ...form, advance_paid: e.target.value })}
                                style={s.input}
                            />
                        </Field>
                    </div>

                    {/* Payment method */}
                    <Field icon={<CreditCard size={14} />} label="Mode de paiement">
                        <div style={s.payRow}>
                            {(['cash', 'tpe'] as const).map(m => (
                                <button key={m} type="button"
                                    onClick={() => setForm({ ...form, payment_method: m })}
                                    style={{
                                        ...s.payBtn,
                                        background: form.payment_method === m ? (m === 'cash' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)') : 'transparent',
                                        borderColor: form.payment_method === m ? (m === 'cash' ? '#22c55e' : '#6366f1') : 'rgba(255,255,255,0.08)',
                                        color: form.payment_method === m ? (m === 'cash' ? '#22c55e' : '#818cf8') : '#94a3b8',
                                    }}>
                                    {m === 'cash' ? <Banknote size={14} /> : <CreditCard size={14} />}
                                    {m === 'cash' ? 'Espèces' : 'TPE / Carte'}
                                </button>
                            ))}
                        </div>
                    </Field>

                    {/* Notes */}
                    <Field icon={<StickyNote size={14} />} label="Notes (optionnel)">
                        <textarea rows={2}
                            placeholder="Allergies, demandes spéciales..."
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            style={{ ...s.input, resize: 'none' }}
                        />
                    </Field>

                    {/* Balance */}
                    {form.total_price && (
                        <div style={s.balanceRow}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Reste à payer</span>
                            <span style={{ color: parseFloat(form.advance_paid || '0') >= parseFloat(form.total_price) ? '#22c55e' : '#f97316', fontWeight: 700 }}>
                                {(parseFloat(form.total_price) - parseFloat(form.advance_paid || '0')).toFixed(2)} DH
                            </span>
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={s.footer}>
                        <button type="button" onClick={onClose} style={s.cancelBtn}>Annuler</button>
                        <button type="submit" disabled={loading} style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Enregistrement...' : '✓ Confirmer la réservation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 500, color: '#94a3b8' }}>
                <span style={{ color: '#f97316' }}>{icon}</span>
                {label}
            </label>
            {children}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    },
    modal: {
        background: '#13131c', borderRadius: 16, border: '1px solid rgba(249,115,22,0.25)',
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 80px rgba(249,115,22,0.08)',
    },
    header: {
        padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    },
    title: { fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 4 },
    subtitle: { fontSize: '0.8rem', color: '#64748b' },
    closeBtn: {
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, padding: 6, cursor: 'pointer', color: '#94a3b8', display: 'flex',
    },
    form: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 },
    input: {
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, color: '#f1f5f9', fontSize: '0.875rem', padding: '10px 12px', outline: 'none', width: '100%',
    },
    payRow: { display: 'flex', gap: 8 },
    payBtn: {
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 12px', border: '1px solid', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
        transition: 'all 0.15s',
    },
    balanceRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
    },
    footer: { display: 'flex', gap: 10, marginTop: 4 },
    cancelBtn: {
        flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 9, color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
    },
    submitBtn: {
        flex: 2, padding: '11px', background: 'linear-gradient(135deg,#f97316,#ea580c)',
        border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: '0.875rem',
        cursor: 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
    },
};
