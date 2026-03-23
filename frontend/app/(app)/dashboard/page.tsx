'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Summary { total: number; advance: number; count: number; }
interface DayBreakdown { date: string; total: number; cash: number; tpe: number; count: number; }

export default function DashboardPage() {
    const [summary, setSummary] = useState<{ daily: Summary; weekly: Summary; monthly: Summary } | null>(null);
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [payFilter, setPayFilter] = useState<'all' | 'cash' | 'tpe'>('all');
    const [breakdown, setBreakdown] = useState<DayBreakdown[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sum, rev] = await Promise.all([
                api.get('/analytics/summary'),
                api.get(`/analytics/revenue?period=${period}&payment_method=${payFilter}`),
            ]);
            setSummary(sum.data);
            setBreakdown(rev.data.daily_breakdown);
        } catch { toast.error('Erreur chargement analytics'); }
        finally { setLoading(false); }
    }, [period, payFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const maxTotal = Math.max(...breakdown.map(d => d.total), 1);

    return (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: '100%' }}>

            <h1 style={{ fontWeight: 700, fontSize: '1.15rem' }}>📊 Dashboard & Analytiques</h1>

            {/* Summary cards */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    {([
                        { label: "Aujourd'hui", data: summary.daily, color: '#f97316', icon: '📅' },
                        { label: 'Cette semaine', data: summary.weekly, color: '#22c55e', icon: '📆' },
                        { label: 'Ce mois', data: summary.monthly, color: '#a855f7', icon: '🗓️' },
                    ] as const).map(({ label, data, color, icon }) => (
                        <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 12, border: `1px solid ${color}22`, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{icon} {label}</span>
                                <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: `${color}18`, color }}>{data.count} rés.</span>
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color, marginBottom: 3, lineHeight: 1 }}>
                                {data.total.toLocaleString('fr-FR')} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>DH</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                Avances : {data.advance.toLocaleString('fr-FR')} DH
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Chart filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Période :</span>
                {(['daily', 'weekly', 'monthly'] as const).map(p => (
                    <button key={p} onClick={() => setPeriod(p)} style={{
                        padding: '5px 12px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: '0.78rem',
                        background: period === p ? 'rgba(249,115,22,0.15)' : 'transparent',
                        borderColor: period === p ? '#f97316' : 'rgba(255,255,255,0.1)',
                        color: period === p ? '#f97316' : 'var(--text-secondary)',
                    }}>
                        {p === 'daily' ? 'Jour' : p === 'weekly' ? 'Semaine' : 'Mois'}
                    </button>
                ))}
                <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Paiement :</span>
                {(['all', 'cash', 'tpe'] as const).map(m => (
                    <button key={m} onClick={() => setPayFilter(m)} style={{
                        padding: '5px 12px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: '0.78rem',
                        background: payFilter === m ? 'rgba(99,102,241,0.15)' : 'transparent',
                        borderColor: payFilter === m ? '#6366f1' : 'rgba(255,255,255,0.1)',
                        color: payFilter === m ? '#818cf8' : 'var(--text-secondary)',
                    }}>
                        {m === 'all' ? 'Tous' : m === 'cash' ? 'Espèces' : 'TPE'}
                    </button>
                ))}
            </div>

            {/* Bar chart */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
                <h3 style={{ fontSize: '0.87rem', fontWeight: 600, marginBottom: 18, color: 'var(--text-secondary)' }}>
                    CA par jour {payFilter !== 'all' ? `(${payFilter === 'cash' ? 'Espèces' : 'TPE'})` : ''}
                </h3>
                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Chargement...</div>
                ) : breakdown.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Aucune donnée pour cette période</div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, overflowX: 'auto', paddingBottom: 4 }}>
                        {breakdown.map((d) => {
                            const cashH = (d.cash / maxTotal) * 155;
                            const tpeH = (d.tpe / maxTotal) * 155;
                            return (
                                <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48, flex: 1 }}>
                                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap' }}>
                                        {d.total.toLocaleString('fr-FR')}
                                    </div>
                                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 155 }}>
                                        <div style={{ width: 14, height: Math.max(cashH, 2), background: 'linear-gradient(to top,#15803d,#22c55e)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} title={`Espèces: ${d.cash} DH`} />
                                        <div style={{ width: 14, height: Math.max(tpeH, 2), background: 'linear-gradient(to top,#4338ca,#818cf8)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} title={`TPE: ${d.tpe} DH`} />
                                    </div>
                                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} /> Espèces
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: '#818cf8' }} /> TPE
                    </div>
                </div>
            </div>
        </div>
    );
}
