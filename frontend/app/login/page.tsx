'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAppStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { setUser, setToken } = useAppStore();
    const [form, setForm] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.username || !form.password) {
            toast.error(t('login.emptyFields'));
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', form);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setToken(data.access_token);
            setUser(data.user);
            toast.success(t('login.welcome', { username: data.user.username }));
            if (data.user.role === 'admin') {
                router.replace('/dashboard');
            } else {
                router.replace('/plan');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || t('login.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            {/* Language Switch */}
            <div style={{ position: 'absolute', top: 32, right: 32, display: 'flex', gap: 12, zIndex: 10 }}>
                <button 
                    onClick={() => i18n.changeLanguage('fr')} 
                    style={{ background: i18n.language === 'fr' ? 'rgba(246,188,89,0.2)' : 'transparent', border: '1px solid rgba(246,188,89,0.5)', color: '#fff', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                >
                    FR
                </button>
                <button 
                    onClick={() => i18n.changeLanguage('ar')}
                    style={{ background: i18n.language === 'ar' ? 'rgba(246,188,89,0.2)' : 'transparent', border: '1px solid rgba(246,188,89,0.5)', color: '#fff', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                >
                    عربية
                </button>
            </div>

            {/* Animated BG */}
            <div style={styles.bgGlow1} />
            <div style={styles.bgGlow2} />

            <motion.div 
                className="glass-panel"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ ...styles.card, padding: '54px 48px' }}
            >
                {/* Logo */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    style={styles.logoWrap}
                >
                    <img
                        src="/logo.png"
                        alt="Tiger Club Logo"
                        style={{
                            width: 100,
                            height: 100,
                            marginBottom: 20,
                            filter: 'drop-shadow(0 0 20px rgba(246,188,89,0.5))'
                        }}
                    />
                    <h1 className="luxury-text" style={{ fontSize: '2.5rem', marginBottom: 8, lineHeight: 1 }}>{t('login.title')}</h1>
                    <p style={styles.sub}>{t('login.subtitle')}</p>
                </motion.div>

                <motion.form 
                    onSubmit={handleSubmit} style={styles.form}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                >
                    <div style={styles.field}>
                        <label style={styles.label}>{t('login.username')}</label>
                        <input
                            type="text"
                            placeholder="admin"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            style={styles.input}
                            autoComplete="username"
                            dir="auto"
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>{t('login.password')}</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            style={styles.input}
                            autoComplete="current-password"
                            dir="auto"
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{
                        ...styles.btn,
                        opacity: loading ? 0.7 : 1,
                    }}>
                        {loading ? t('login.loading') : t('login.submit')}
                    </button>
                </motion.form>

                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    style={styles.footer}
                >
                    {t('login.footer')} &copy; {new Date().getFullYear()}
                </motion.p>
            </motion.div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        background: '#040406',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    bgGlow1: {
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: 700,
        height: 700,
        background: 'radial-gradient(circle, rgba(246,188,89,0.08) 0%, transparent 60%)',
        borderRadius: '50%',
        pointerEvents: 'none',
    },
    bgGlow2: {
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(124,51,96,0.1) 0%, transparent 60%)',
        borderRadius: '50%',
        pointerEvents: 'none',
    },
    card: {
        width: '100%',
        maxWidth: 440,
        position: 'relative',
        zIndex: 1,
    },
    logoWrap: {
        textAlign: 'center',
        marginBottom: 40,
    },
    brand: {
        // Will be managed by .luxury-text
    },
    sub: {
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 600,
    },
    form: { display: 'flex', flexDirection: 'column', gap: 20 },
    field: { display: 'flex', flexDirection: 'column', gap: 8 },
    label: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: {
        background: 'rgba(5,5,8,0.7)',
        border: '1px solid rgba(246,188,89,0.15)',
        borderRadius: 12,
        color: '#fff',
        fontSize: '1rem',
        padding: '16px',
        outline: 'none',
        width: '100%',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.6)',
    },
    btn: {
        marginTop: 12,
        padding: '16px',
        background: 'linear-gradient(135deg, #F6BC59, #F37950)',
        border: 'none',
        borderRadius: 12,
        color: '#fff',
        fontWeight: 800,
        fontSize: '1.05rem',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 8px 24px rgba(246,188,89,0.25)',
    },
    footer: {
        marginTop: 32,
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        fontWeight: 500,
    },
};
