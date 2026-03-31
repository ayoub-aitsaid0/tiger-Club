'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Calendar, CalendarDays, TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface Summary { total: number; advance: number; count: number; }
interface DayBreakdown { date: string; total: number; cash: number; tpe: number; count: number; }

export default function DashboardPage() {
    const { t } = useTranslation();
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

    const maxTotal = Math.max(...breakdown.map(d => d.count), 1);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 32, overflow: 'auto', height: '100%', WebkitOverflowScrolling: 'touch' }}
        >

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 className="luxury-text" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>
                    <Sparkles size={28} color="var(--gold)" />
                    {t('dashboard.title')} <span style={{ color: 'var(--text-muted)', fontSize: '1rem', letterSpacing: '0.2em', fontWeight: 600 }}>{t('dashboard.subtitle')}</span>
                </h1>
            </div>

            {/* Summary cards */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                    {([
                        { label: t('dashboard.today'), data: summary.daily, color: 'var(--gold)', icon: <TrendingUp size={16} />, delay: 0.1 },
                        { label: t('dashboard.thisWeek'), data: summary.weekly, color: 'var(--zone-teal)', icon: <Calendar size={16} />, delay: 0.2 },
                        { label: t('dashboard.thisMonth'), data: summary.monthly, color: 'var(--zone-purple)', icon: <CalendarDays size={16} />, delay: 0.3 },
                    ] as const).map(({ label, data, color, icon, delay }) => (
                        <motion.div 
                            key={label} 
                            className="glass-panel"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: delay * 0.5 }}
                            style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}
                        >
                            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: `radial-gradient(circle, ${color}20 0%, transparent 60%)`, filter: 'blur(30px)', pointerEvents: 'none' }} />
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, position: 'relative', zIndex: 1 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {icon} {label}
                                </span>
                            </div>
                            <div className="luxury-text" style={{ fontSize: '2.8rem', marginBottom: 8, lineHeight: 1, position: 'relative', zIndex: 1, background: `linear-gradient(135deg, #fff, ${color})`, WebkitBackgroundClip: 'text', textShadow: `0 4px 24px ${color}30` }}>
                                {data.count} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textShadow: 'none', letterSpacing: '0.05em' }}>{t('dashboard.reservations')}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Chart Container */}
            <motion.div 
                className="glass-panel" 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.15 }}
                style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column' }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <h3 className="luxury-text" style={{ fontSize: '1.4rem', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {t('dashboard.revenueTitle')} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', verticalAlign: 'middle', marginLeft: 12 }}>{payFilter !== 'all' ? `• ${payFilter === 'cash' ? t('dashboard.cash') : t('dashboard.tpe')}` : ''}</span>
                    </h3>

                    {/* Chart filters */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
                            {(['daily', 'weekly', 'monthly'] as const).map(p => (
                                <button key={p} onClick={() => setPeriod(p)} style={{
                                    padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                                    background: period === p ? 'rgba(246,188,89,0.15)' : 'transparent',
                                    color: period === p ? '#F6BC59' : 'var(--text-secondary)',
                                }}>
                                    {t(`dashboard.${p}`)}
                                </button>
                            ))}
                        </div>
                        
                        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
                            {(['all', 'cash', 'tpe'] as const).map(m => (
                                <button key={m} onClick={() => setPayFilter(m)} style={{
                                    padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                                    background: payFilter === m ? 'rgba(27,150,132,0.15)' : 'transparent',
                                    color: payFilter === m ? '#1B9684' : 'var(--text-secondary)',
                                }}>
                                    {t(`dashboard.${m}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('dashboard.loading')}</div>
                ) : breakdown.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('dashboard.noData')}</div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flex: 1, minHeight: 220, overflowX: 'auto', paddingBottom: 8, paddingLeft: 4, paddingRight: 4, WebkitOverflowScrolling: 'touch' }}>
                        {breakdown.map((d) => {
                            const barH = (d.count / maxTotal) * 100;
                            return (
                                <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 60, flex: 1, height: '100%' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'auto', marginBottom: 4, whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: '0.02em' }}>
                                        {d.count > 0 ? d.count : ''}
                                    </div>
                                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%', minHeight: 180 }}>
                                        <div style={{ width: 28, height: `${Math.max(barH, 1)}%`, background: 'linear-gradient(to top,#1B9684,#2dd4bf)', borderRadius: '4px 4px 0 0', transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: barH > 5 ? '0 0 12px rgba(45,212,191,0.2)' : 'none' }} title={`${d.count} réservations`} />
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                        {new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#fff', fontWeight: 500 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(to top,#1B9684,#2dd4bf)' }} /> {t('dashboard.cashLegend')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#fff', fontWeight: 500 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(to top,#7C3360,#c026d3)' }} /> {t('dashboard.tpeLegend')}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
