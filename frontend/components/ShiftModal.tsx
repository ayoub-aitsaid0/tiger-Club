'use client';
import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
    onConfirmed: (operatorName: string) => void;
}

export default function ShiftModal({ onConfirmed }: Props) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) { toast.error('Veuillez saisir votre prénom'); return; }

        setLoading(true);
        try {
            await api.post('/shifts/', { operator_name: trimmed });
            toast.success(`Bonne soirée, ${trimmed} !`);
            onConfirmed(trimmed);
        } catch (err: any) {
            // 409 = shift already set (race condition or double-submit)
            if (err.response?.status === 409) {
                const existing = err.response.data?.shift?.operator_name;
                if (existing) {
                    onConfirmed(existing);
                    return;
                }
            }
            toast.error(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.overlay}>
            <div style={s.modal}>
                {/* Gold top accent line */}
                <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #c8a84b, transparent)', borderRadius: '16px 16px 0 0' }} />

                <div style={s.body}>
                    {/* Icon badge */}
                    <div style={s.iconWrap}>
                        <UserCheck size={28} color="#c8a84b" strokeWidth={1.5} />
                    </div>

                    <h2 style={s.title}>PRISE DE SERVICE</h2>
                    <p style={s.subtitle}>
                        Qui gère les réservations ce soir ?
                    </p>

                    <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <input
                            autoFocus
                            placeholder="Votre prénom..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={s.input}
                            maxLength={60}
                        />

                        <button type="submit" disabled={loading || !name.trim()} style={{
                            ...s.btn,
                            opacity: loading || !name.trim() ? 0.55 : 1,
                            cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                        }}>
                            {loading ? 'Enregistrement…' : '✓ Commencer la soirée'}
                        </button>
                    </form>

                    <p style={s.hint}>
                        Toutes les réservations de ce soir seront attribuées à ce nom.
                    </p>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 16,
    },
    modal: {
        background: 'rgba(12,10,18,0.98)',
        border: '1px solid rgba(200,168,75,0.3)',
        borderRadius: 16,
        width: '100%', maxWidth: 420,
        boxShadow: '0 40px 80px rgba(0,0,0,0.9), 0 0 140px rgba(200,168,75,0.08)',
        overflow: 'hidden',
    },
    body: {
        padding: '32px 32px 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    },
    iconWrap: {
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(200,168,75,0.08)',
        border: '1px solid rgba(200,168,75,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 32px rgba(200,168,75,0.12)',
    },
    title: {
        fontSize: '1.2rem', fontWeight: 800, color: '#f5e6b8',
        letterSpacing: '0.12em', margin: 0,
        fontFamily: "'Outfit', sans-serif",
        textAlign: 'center',
    },
    subtitle: {
        fontSize: '0.88rem', color: '#8888a0', margin: 0,
        textAlign: 'center', lineHeight: 1.5,
    },
    input: {
        background: 'rgba(10,10,16,0.8)',
        border: '1px solid rgba(200,168,75,0.2)',
        borderRadius: 12, color: '#f5e6b8',
        fontSize: '1rem', padding: '14px 16px',
        outline: 'none', width: '100%',
        fontFamily: "'Outfit', sans-serif",
        boxSizing: 'border-box',
        textAlign: 'center',
        letterSpacing: '0.04em',
    },
    btn: {
        padding: '14px',
        background: 'linear-gradient(135deg, rgba(200,168,75,0.9), rgba(160,120,40,0.9))',
        border: '1px solid rgba(246,188,89,0.4)',
        borderRadius: 12, color: '#fff',
        fontWeight: 800, fontSize: '0.9rem',
        fontFamily: "'Outfit', sans-serif",
        letterSpacing: '0.06em', textTransform: 'uppercase' as const,
        boxShadow: '0 4px 20px rgba(200,168,75,0.25)',
        transition: 'all 0.2s',
    },
    hint: {
        fontSize: '0.72rem', color: '#555568',
        textAlign: 'center', margin: 0, lineHeight: 1.5,
    },
};
