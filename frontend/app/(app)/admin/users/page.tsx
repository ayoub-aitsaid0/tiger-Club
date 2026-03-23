'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { UserPlus, ShieldCheck, ShieldOff, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface User { id: number; username: string; role: string; is_active: boolean; created_at: string; }

export default function UsersPage() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', role: 'caissier' });

    const fetch = async () => {
        setLoading(true);
        try { const { data } = await api.get('/users/'); setUsers(data); }
        catch { toast.error(t('adminUsers.messages.loadError')); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users/', form);
            toast.success(t('adminUsers.messages.createSuccess'));
            setShowForm(false);
            setForm({ username: '', password: '', role: 'caissier' });
            fetch();
        } catch (err: any) { toast.error(err.response?.data?.error || t('adminUsers.messages.error')); }
    };

    const toggleActive = async (user: User) => {
        try {
            await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
            toast.success(user.is_active ? t('adminUsers.messages.accessRevoked') : t('adminUsers.messages.accessRestored'));
            fetch();
        } catch (err: any) { toast.error(err.response?.data?.error || t('adminUsers.messages.error')); }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ padding: '32px 32px 100px', display: 'flex', flexDirection: 'column', gap: 32, overflow: 'auto', height: '100%' }}
        >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                <h1 className="luxury-text" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '2rem', margin: 0, textTransform: 'uppercase', flex: 1 }}>
                    <Users size={28} color="var(--gold)" /> 
                    {t('adminUsers.title')}
                </h1>
                <button onClick={() => setShowForm(!showForm)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                    background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 9,
                    color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}>
                    <UserPlus size={14} /> {t('adminUsers.actions.newCashier')}
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <form onSubmit={handleCreate} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid rgba(249,115,22,0.2)', padding: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>{t('adminUsers.fields.username')}</label>
                        <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="caissier1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '9px 12px', width: '100%', outline: 'none' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>{t('adminUsers.fields.password')}</label>
                        <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '9px 12px', width: '100%', outline: 'none' }} />
                    </div>
                    <div style={{ minWidth: 130 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>{t('adminUsers.fields.role')}</label>
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '9px 12px', width: '100%', outline: 'none' }}>
                            <option value="caissier">{t('adminUsers.roles.caissier')}</option>
                            <option value="admin">{t('adminUsers.roles.admin')}</option>
                        </select>
                    </div>
                    <button type="submit" style={{ padding: '9px 20px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{t('adminUsers.actions.create')}</button>
                    <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer' }}>{t('adminUsers.actions.cancel')}</button>
                </form>
            )}

            {/* User table */}
            <div className="glass-panel" style={{ flex: 1, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: '#0A0A10' }}>
                        <tr>
                            {[t('adminUsers.tableHeaders.id'), t('adminUsers.tableHeaders.user'), t('adminUsers.tableHeaders.role'), t('adminUsers.tableHeaders.status'), t('adminUsers.tableHeaders.createdAt'), t('adminUsers.tableHeaders.actions')].map(h => (
                                <th key={h} style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(246,188,89,0.1)' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>{t('adminUsers.loading')}</td></tr>
                            : users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', background: 'transparent' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(246,188,89,0.03)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{u.id}</td>
                                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#fff' }}>{u.username}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: u.role === 'admin' ? '#F6BC59' : '#94a3b8', background: u.role === 'admin' ? 'rgba(246,188,89,0.1)' : 'transparent', padding: u.role === 'admin' ? '4px 8px' : '4px 0', borderRadius: 6 }}>
                                            <ShieldCheck size={14} /> {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: u.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', color: u.is_active ? '#22c55e' : '#64748b', border: `1px solid ${u.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)'}` }}>
                                            {u.is_active ? t('adminUsers.status.active') : t('adminUsers.status.revoked')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        {u.role !== 'admin' && (
                                            <button onClick={() => toggleActive(u)} style={{
                                                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid', cursor: 'pointer', fontSize: '0.75rem',
                                                background: u.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                                borderColor: u.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                                                color: u.is_active ? '#ef4444' : '#22c55e',
                                            }}>
                                                {u.is_active ? <><ShieldOff size={11} /> {t('adminUsers.actions.revoke')}</> : <><ShieldCheck size={11} /> {t('adminUsers.actions.restore')}</>}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
