'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAppStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const router = useRouter();
    const { setUser, setToken } = useAppStore();
    const [form, setForm] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.username || !form.password) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', form);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setToken(data.access_token);
            setUser(data.user);
            toast.success(`Bienvenue, ${data.user.username} !`);
            if (data.user.role === 'admin') {
                router.replace('/dashboard');
            } else {
                router.replace('/plan');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            {/* Animated BG */}
            <div style={styles.bgGlow1} />
            <div style={styles.bgGlow2} />

            <div style={styles.card}>
                {/* Logo */}
                <div style={styles.logoWrap}>
                    <img
                        src="/logo.png"
                        alt="Tiger Club Logo"
                        style={{
                            width: 100,
                            height: 100,
                            marginBottom: 20,
                            filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.5))'
                        }}
                    />
                    <h1 style={styles.brand}>TIGER CLUB</h1>
                    <p style={styles.sub}>Système de Gestion des Réservations</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.field}>
                        <label style={styles.label}>Nom d&apos;utilisateur</label>
                        <input
                            type="text"
                            placeholder="admin"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            style={styles.input}
                            autoComplete="username"
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Mot de passe</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            style={styles.input}
                            autoComplete="current-password"
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{
                        ...styles.btn,
                        opacity: loading ? 0.7 : 1,
                    }}>
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>

                <p style={styles.footer}>Tiger Club &copy; {new Date().getFullYear()}</p>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    bgGlow1: {
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
    },
    bgGlow2: {
        position: 'absolute',
        bottom: '-20%',
        right: '-10%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
    },
    card: {
        background: 'rgba(22,22,31,0.95)',
        border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: 20,
        padding: '48px 40px',
        width: '100%',
        maxWidth: 420,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 80px rgba(249,115,22,0.08)',
        position: 'relative',
        zIndex: 1,
    },
    logoWrap: {
        textAlign: 'center',
        marginBottom: 36,
    },
    logoCircle: {
        fontSize: 52,
        marginBottom: 12,
        display: 'block',
        filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.5))',
    },
    brand: {
        fontSize: '1.8rem',
        fontWeight: 800,
        letterSpacing: '0.15em',
        background: 'linear-gradient(135deg, #f97316, #fbbf24)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: 6,
    },
    sub: {
        color: '#64748b',
        fontSize: '0.8rem',
        letterSpacing: '0.05em',
    },
    form: { display: 'flex', flexDirection: 'column', gap: 18 },
    field: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: '0.825rem', fontWeight: 500, color: '#94a3b8' },
    input: {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        color: '#f1f5f9',
        fontSize: '0.95rem',
        padding: '12px 14px',
        outline: 'none',
        width: '100%',
        transition: 'border-color 0.2s',
    },
    btn: {
        marginTop: 8,
        padding: '13px',
        background: 'linear-gradient(135deg, #f97316, #ea580c)',
        border: 'none',
        borderRadius: 10,
        color: '#fff',
        fontWeight: 700,
        fontSize: '1rem',
        letterSpacing: '0.03em',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
    },
    footer: {
        marginTop: 28,
        textAlign: 'center',
        color: '#334155',
        fontSize: '0.75rem',
    },
};
