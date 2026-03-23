'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';
import {
    LayoutDashboard, Map, CalendarDays, Users, ClipboardList,
    LogOut, ChevronLeft, ChevronRight, ShieldCheck, LayoutGrid,
    Maximize2, PanelLeftOpen,
} from 'lucide-react';

const NAV_ITEMS = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin'] },
    { href: '/reservations', icon: CalendarDays, label: 'Réservations', roles: ['admin', 'caissier'] },
    { href: '/plan', icon: Map, label: 'Plan de Salle', roles: ['admin', 'caissier'] },
    { href: '/admin/users', icon: Users, label: 'Utilisateurs', roles: ['admin'] },
    { href: '/admin/tables', icon: LayoutGrid, label: 'Tables', roles: ['admin'] },
    { href: '/admin/logs', icon: ClipboardList, label: 'Audit Logs', roles: ['admin'] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, setUser, setToken, logout } = useAppStore();
    const [collapsed, setCollapsed]       = useState(false);
    const [mapExpanded, setMapExpanded]   = useState(false); // sidebar hidden → map full-width
    const [ready, setReady]               = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (!token || !storedUser) {
            router.replace('/login');
            return;
        }
        setToken(token);
        setUser(JSON.parse(storedUser));
        setReady(true);
    }, [router, setToken, setUser]);

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    if (!ready || !user) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(249,115,22,0.3)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const navItems = NAV_ITEMS.filter(n => n.roles.includes(user.role));

    const isMapPage = pathname === '/plan';

    // On the map page the caissier can toggle the sidebar off for full-width map
    const sidebarWidth = mapExpanded ? 0 : collapsed ? 64 : 220;

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <aside style={{
                width: sidebarWidth,
                minWidth: sidebarWidth,
                background: 'var(--bg-secondary)',
                borderRight: mapExpanded ? 'none' : '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.25s ease, min-width 0.25s ease',
                flexShrink: 0,
                position: 'relative',
                zIndex: 10,
                overflow: 'hidden',
            }}>
                {/* Logo */}
                <div style={{ padding: collapsed ? '20px 0' : '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                        src="/logo-app-ti.png"
                        alt="Tiger Club Logo"
                        style={{
                            width: 36, height: 36, objectFit: 'contain', flexShrink: 0,
                            filter: 'drop-shadow(0 0 8px rgba(249,115,22,0.4))',
                        }}
                    />
                    {!collapsed && (
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', background: 'linear-gradient(135deg,#f97316,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TIGER CLUB</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>Réservations</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {navItems.map(({ href, icon: Icon, label }) => {
                        const active = pathname.startsWith(href);
                        return (
                            <Link key={href} href={href} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: collapsed ? '10px 0' : '10px 12px',
                                borderRadius: 8,
                                color: active ? '#f97316' : 'var(--text-secondary)',
                                background: active ? 'rgba(249,115,22,0.1)' : 'transparent',
                                transition: 'all 0.15s',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                fontWeight: active ? 600 : 400,
                                fontSize: '0.875rem',
                                border: active ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                                whiteSpace: 'nowrap',
                            }}>
                                <Icon size={17} style={{ flexShrink: 0 }} />
                                {!collapsed && <span>{label}</span>}
                            </Link>
                        );
                    })}

                    {/* ── Expand-map button (caissier on /plan only) ── */}
                    {isMapPage && (
                        <button onClick={() => setMapExpanded(true)} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: collapsed ? '10px 0' : '10px 12px',
                            marginTop: 6,
                            borderRadius: 8, border: '1px solid rgba(200,168,75,0.18)',
                            background: 'transparent', cursor: 'pointer',
                            color: 'var(--text-muted)',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            fontSize: '0.875rem', whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                        }}>
                            <Maximize2 size={16} style={{ flexShrink: 0 }} />
                            {!collapsed && <span>Carte plein écran</span>}
                        </button>
                    )}
                </nav>

                {/* User + Logout */}
                <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '12px 0' : '12px 16px' }}>
                    {!collapsed && (
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{user.username}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <ShieldCheck size={11} color={user.role === 'admin' ? '#f97316' : '#64748b'} />
                                <span style={{ fontSize: '0.7rem', color: user.role === 'admin' ? '#f97316' : 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</span>
                            </div>
                        </div>
                    )}
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: collapsed ? '8px 0' : '8px 10px',
                        width: '100%', background: 'transparent', border: 'none',
                        color: 'var(--text-muted)', borderRadius: 8, cursor: 'pointer',
                        fontSize: '0.8rem', justifyContent: collapsed ? 'center' : 'flex-start',
                        whiteSpace: 'nowrap',
                    }}>
                        <LogOut size={15} />
                        {!collapsed && 'Déconnexion'}
                    </button>
                </div>

                {/* Collapse toggle */}
                <button onClick={() => setCollapsed(!collapsed)} style={{
                    position: 'absolute', top: '50%', right: -12, transform: 'translateY(-50%)',
                    width: 24, height: 24, background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--text-secondary)',
                }}>
                    {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>
            </aside>

            {/* ── Main ──────────────────────────────────────────────────── */}
            <main style={{
                flex: 1, minWidth: 0,
                overflow: isMapPage ? 'hidden' : 'auto',
                display: 'flex', flexDirection: 'column',
                position: 'relative',
            }}>
                {/* Floating "restore sidebar" button — only when map is full-width */}
                {isMapPage && mapExpanded && (
                    <button
                        onClick={() => setMapExpanded(false)}
                        title="Afficher le menu"
                        style={{
                            position: 'absolute', top: 10, left: 10, zIndex: 50,
                            width: 34, height: 34,
                            background: 'rgba(8,8,14,0.88)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid rgba(200,168,75,0.30)',
                            borderRadius: 9,
                            color: '#c8a84b', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                        }}
                    >
                        <PanelLeftOpen size={15} />
                    </button>
                )}
                {children}
            </main>
        </div>
    );
}
