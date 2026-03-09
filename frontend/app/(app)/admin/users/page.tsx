'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { UserPlus, ShieldCheck, ShieldOff, Lock } from 'lucide-react';

interface User { id: number; username: string; role: string; is_active: boolean; created_at: string; }

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', role: 'caissier' });

    const fetch = async () => {
        setLoading(true);
        try { const { data } = await api.get('/users/'); setUsers(data); }
        catch { toast.error('Erreur chargement utilisateurs'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users/', form);
            toast.success('Utilisateur créé');
            setShowForm(false);
            setForm({ username: '', password: '', role: 'caissier' });
            fetch();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Erreur'); }
    };

    const toggleActive = async (user: User) => {
        try {
            await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
            toast.success(user.is_active ? 'Accès révoqué' : 'Accès restauré');
            fetch();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Erreur'); }
    };

    return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontWeight: 700, fontSize: '1.2rem', flex: 1 }}>👥 Gestion des Utilisateurs</h1>
                <button onClick={() => setShowForm(!showForm)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                    background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 9,
                    color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}>
                    <UserPlus size={14} /> Nouveau caissier
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <form onSubmit={handleCreate} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid rgba(249,115,22,0.2)', padding: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Nom d&apos;utilisateur</label>
                        <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="caissier1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '9px 12px', width: '100%', outline: 'none' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Mot de passe</label>
                        <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '9px 12px', width: '100%', outline: 'none' }} />
                    </div>
                    <div style={{ minWidth: 130 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Rôle</label>
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '9px 12px', width: '100%', outline: 'none' }}>
                            <option value="caissier">Caissier</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" style={{ padding: '9px 20px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Créer</button>
                    <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer' }}>Annuler</button>
                </form>
            )}

            {/* User table */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['#', 'Utilisateur', 'Rôle', 'Statut', 'Créé le', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</td></tr>
                            : users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.id}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.username}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: u.role === 'admin' ? '#f97316' : '#94a3b8' }}>
                                            <ShieldCheck size={12} /> {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4, background: u.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', color: u.is_active ? '#22c55e' : '#64748b' }}>
                                            {u.is_active ? 'Actif' : 'Révoqué'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {u.role !== 'admin' && (
                                            <button onClick={() => toggleActive(u)} style={{
                                                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid', cursor: 'pointer', fontSize: '0.75rem',
                                                background: u.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                                borderColor: u.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                                                color: u.is_active ? '#ef4444' : '#22c55e',
                                            }}>
                                                {u.is_active ? <><ShieldOff size={11} /> Révoquer</> : <><ShieldCheck size={11} /> Restaurer</>}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
