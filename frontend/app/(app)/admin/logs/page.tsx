'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, X, ClipboardList, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuditLog { id: number; username: string; action: string; details: any; created_at: string; }

const ACTION_COLORS: Record<string, string> = {
    LOGIN: '#818cf8',
    CREATE_RESERVATION: '#22c55e',
    UPDATE_RESERVATION: '#f97316',
    CANCEL_RESERVATION: '#ef4444',
    CREATE_USER: '#a855f7',
    UPDATE_USER: '#fbbf24',
};

import { useTranslation } from 'react-i18next';

export default function AuditLogsPage() {
    const { t } = useTranslation();
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
        } catch { toast.error(t('adminLogs.messages.loadError')); }
        finally { setLoading(false); }
    }, [page, actionFilter, t]);

    useEffect(() => { fetch(); }, [fetch]);

    const getLogDescription = (log: AuditLog) => {
        const d = log.details || {};
        switch (log.action) {
            case 'LOGIN':
                return t('adminLogs.descriptions.LOGIN');
            case 'CREATE_RESERVATION':
                return t('adminLogs.descriptions.CREATE_RESERVATION', { id: d.id || '?', customer: d.customer_name || t('adminLogs.descriptions.unknownCustomer') });
            case 'UPDATE_RESERVATION': {
                const changes = [];
                if (d.old?.status !== d.new?.status) changes.push(t('adminLogs.descriptions.statusChange', { old: d.old?.status, new: d.new?.status }));
                if (d.old?.total_price !== d.new?.total_price) changes.push(t('adminLogs.descriptions.priceChange', { old: d.old?.total_price, new: d.new?.total_price }));
                const joinedChanges = changes.length ? ` (${changes.join(', ')})` : '';
                return t('adminLogs.descriptions.UPDATE_RESERVATION', { id: d.new?.id || '?', changes: joinedChanges });
            }
            case 'CANCEL_RESERVATION':
                return t('adminLogs.descriptions.CANCEL_RESERVATION', { id: d.old?.id || '?' });
            case 'CREATE_USER':
                return t('adminLogs.descriptions.CREATE_USER', { username: d.username, role: d.role });
            case 'UPDATE_USER':
                return t('adminLogs.descriptions.UPDATE_USER', { username: d.new?.username || d.old?.username });
            default:
                return log.action.toLowerCase().replace('_', ' ');
        }
    };

    const ACTION_LABELS: Record<string, string> = {
        LOGIN: t('adminLogs.actions.LOGIN'),
        CREATE_RESERVATION: t('adminLogs.actions.CREATE_RESERVATION'),
        UPDATE_RESERVATION: t('adminLogs.actions.UPDATE_RESERVATION'),
        CANCEL_RESERVATION: t('adminLogs.actions.CANCEL_RESERVATION'),
        CREATE_USER: t('adminLogs.actions.CREATE_USER'),
        UPDATE_USER: t('adminLogs.actions.UPDATE_USER'),
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{ padding: '32px 32px 100px', display: 'flex', flexDirection: 'column', gap: 32, overflow: 'auto', height: '100%' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <h1 className="luxury-text" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '2rem', margin: 0, textTransform: 'uppercase', flex: 1 }}>
                    <Sparkles size={28} color="var(--gold)" />
                    {t('adminLogs.title')}
                </h1>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 8 }}>{total > 1 ? t('adminLogs.totalEntries_plural', { count: total }) : t('adminLogs.totalEntries', { count: total })}</span>

                {/* Action filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 12px', minWidth: 200 }}>
                    <Search size={13} color="#64748b" />
                    <input
                        placeholder={t('adminLogs.filterPlaceholder')}
                        value={actionFilter}
                        onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', width: '100%' }}
                    />
                    {actionFilter && <button onClick={() => setActionFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={12} /></button>}
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', height: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead style={{ background: '#0A0A10', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                {[t('adminLogs.tableHeaders.id'), t('adminLogs.tableHeaders.user'), t('adminLogs.tableHeaders.action'), t('adminLogs.tableHeaders.details'), t('adminLogs.tableHeaders.datetime')].map(h => (
                                    <th key={h} style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(246,188,89,0.1)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>{t('adminLogs.loading')}</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>{t('adminLogs.noData')}</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', background: 'transparent' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(246,188,89,0.03)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{log.id}</td>
                                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#fff' }}>{log.username}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: 6, background: `${ACTION_COLORS[log.action] || '#64748b'}18`, color: ACTION_COLORS[log.action] || '#64748b', fontWeight: 700, letterSpacing: '0.02em', border: `1px solid ${ACTION_COLORS[log.action] || '#64748b'}30` }}>
                                            {ACTION_LABELS[log.action] || log.action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', maxWidth: 450 }}>
                                        {getLogDescription(log)}
                                    </td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
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
                        {t('adminLogs.pagination.prev')}
                    </button>
                    <span style={{ padding: '7px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('adminLogs.pagination.page', { page })}</span>
                    <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}
                        style={{ padding: '7px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', opacity: page * 50 >= total ? 0.4 : 1 }}>
                        {t('adminLogs.pagination.next')}
                    </button>
                </div>
            )}
        </motion.div>
    );
}
