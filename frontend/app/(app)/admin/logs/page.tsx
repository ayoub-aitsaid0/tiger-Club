'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, X } from 'lucide-react';

interface AuditLog { id: number; username: string; action: string; details: any; created_at: string; }

const ACTION_COLORS: Record<string, string> = {
    LOGIN: '#818cf8',
    CREATE_RESERVATION: '#22c55e',
    UPDATE_RESERVATION: '#f97316',
    CANCEL_RESERVATION: '#ef4444',
    CREATE_USER: '#a855f7',
    UPDATE_USER: '#fbbf24',
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), per_page: '50' });
            if (actionFilter) params.append('action', actionFilter);
            const { data } = await api.get('/audit/?' + params);
            setLogs(data.items);
            setTotal(data.total);
        } catch { toast.error('Erreur chargement logs'); }
        finally { setLoading(false); }
    }, [page, actionFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    const getLogDescription = (log: AuditLog) => {
        const d = log.details || {};
        switch (log.action) {
            case 'LOGIN':
                return "Connexion à la session sécurisée";
            case 'CREATE_RESERVATION':
                return `Création de la réservation #${d.id || '?'} pour ${d.customer_name || 'Inconnu'}`;
            case 'UPDATE_RESERVATION': {
                const changes = [];
                if (d.old?.status !== d.new?.status) changes.push(`statut: ${d.old?.status}→${d.new?.status}`);
                if (d.old?.total_price !== d.new?.total_price) changes.push(`prix: ${d.old?.total_price}→${d.new?.total_price}DH`);
                return `Modification réservation #${d.new?.id || '?'}${changes.length ? ' (' + changes.join(', ') + ')' : ''}`;
            }
            case 'CANCEL_RESERVATION':
                return `Annulation de la réservation #${d.old?.id || '?'}`;
            case 'CREATE_USER':
                return `Création du compte utilisateur "${d.username}" (${d.role})`;
            case 'UPDATE_USER':
                return `Mise à jour du profil utilisateur "${d.new?.username || d.old?.username}"`;
            default:
                return log.action.toLowerCase().replace('_', ' ');
        }
    };

    const ACTION_LABELS: Record<string, string> = {
        LOGIN: 'Connexion',
        CREATE_RESERVATION: 'Nouvelle Réservation',
        UPDATE_RESERVATION: 'Modification',
        CANCEL_RESERVATION: 'Annulation',
        CREATE_USER: 'Nouvel Utilisateur',
        UPDATE_USER: 'Mise à jour Profil',
    };

    return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ fontWeight: 700, fontSize: '1.2rem', flex: 1 }}>🔍 Audit Logs</h1>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{total} entrées</span>

                {/* Action filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 12px', minWidth: 200 }}>
                    <Search size={13} color="#64748b" />
                    <input
                        placeholder="Filtrer par action..."
                        value={actionFilter}
                        onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', width: '100%' }}
                    />
                    {actionFilter && <button onClick={() => setActionFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={12} /></button>}
                </div>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['#', 'Utilisateur', 'Action', 'Détails', 'Date & Heure'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun log trouvé</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{log.id}</td>
                                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>{log.username}</td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4, background: `${ACTION_COLORS[log.action] || '#64748b'}18`, color: ACTION_COLORS[log.action] || '#64748b', fontWeight: 600, letterSpacing: '0.02em' }}>
                                            {ACTION_LABELS[log.action] || log.action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', maxWidth: 450 }}>
                                        {getLogDescription(log)}
                                    </td>
                                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {new Date(log.created_at).toLocaleString('fr-FR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {total > 50 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                        style={{ padding: '7px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', opacity: page === 1 ? 0.4 : 1 }}>
                        ← Précédent
                    </button>
                    <span style={{ padding: '7px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page}</span>
                    <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}
                        style={{ padding: '7px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', opacity: page * 50 >= total ? 0.4 : 1 }}>
                        Suivant →
                    </button>
                </div>
            )}
        </div>
    );
}
