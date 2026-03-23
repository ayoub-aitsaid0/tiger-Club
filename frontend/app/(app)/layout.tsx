'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';
import {
    LayoutDashboard, Map, CalendarDays, Users, ClipboardList,
    LogOut, ChevronLeft, ChevronRight, ShieldCheck, LayoutGrid,
    Maximize2, PanelLeftOpen, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
    { href: '/dashboard', icon: LayoutDashboard, id: 'dashboard', roles: ['admin'] },
    { href: '/reservations', icon: CalendarDays, id: 'reservations', roles: ['admin', 'caissier'] },
    { href: '/plan', icon: Map, id: 'plan', roles: ['admin', 'caissier'] },
    { href: '/admin/users', icon: Users, id: 'users', roles: ['admin'] },
    { href: '/admin/tables', icon: LayoutGrid, id: 'tables', roles: ['admin'] },
    { href: '/admin/logs', icon: ClipboardList, id: 'logs', roles: ['admin'] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { t, i18n } = useTranslation();
    const { user, setUser, setToken, logout } = useAppStore();
    const [collapsed, setCollapsed]       = useState(false);
    const [mapExpanded, setMapExpanded]   = useState(false); // sidebar hidden → map full-width
    const [ready, setReady]               = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

    const primaryMobileNav = navItems.filter(n => ['/dashboard', '/plan', '/reservations'].includes(n.href));
    const secondaryMobileNav = navItems.filter(n => !primaryMobileNav.includes(n));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
            
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* ── Sidebar (Desktop Only) ─────────────────────────────────── */}
                <aside className="desktop-only glass-panel" style={{
                    width: sidebarWidth,
                    minWidth: sidebarWidth,
                    borderRight: mapExpanded ? 'none' : '1px solid var(--border)',
                    flexDirection: 'column',
                    transition: 'width 0.25s ease, min-width 0.25s ease',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 10,
                    overflow: 'hidden',
                    fontFamily: "'Outfit', 'Inter', sans-serif",
                }}>
                    {/* Logo */}
                    <div style={{ padding: collapsed ? '20px 0' : '20px 16px', borderBottom: '1px solid rgba(246,188,89,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                <div className="luxury-text" style={{ fontSize: '1.2rem', lineHeight: 1 }}>TIGER CLUB</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.15em', textTransform: 'uppercase' }}>VIP System</div>
                            </div>
                        )}
                    </div>

                    {/* Nav */}
                    <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {navItems.map(({ href, icon: Icon, id }) => {
                            const active = pathname.startsWith(href);
                            return (
                                <Link key={href} href={href} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: collapsed ? '10px 0' : '10px 12px',
                                    borderRadius: 8,
                                    color: active ? '#F6BC59' : 'var(--text-secondary)',
                                    background: active ? 'rgba(246,188,89,0.08)' : 'transparent',
                                    transition: 'all 0.15s',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    fontWeight: active ? 600 : 400,
                                    fontSize: '0.875rem',
                                    border: 'none',
                                    borderLeft: active ? '3px solid #F6BC59' : '3px solid transparent',
                                    whiteSpace: 'nowrap',
                                    position: 'relative',
                                }}>
                                    <Icon size={17} style={{ flexShrink: 0 }} />
                                    {!collapsed && <span>{t(`nav.${id}`)}</span>}
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
                        {/* Language Toggles */}
                        {!collapsed && (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                <button onClick={() => i18n.changeLanguage('fr')} style={{ flex: 1, padding: '4px 0', background: i18n.language === 'fr' ? 'rgba(246,188,89,0.2)' : 'transparent', border: '1px solid rgba(246,188,89,0.3)', borderRadius: 6, color: '#fff', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>FR</button>
                                <button onClick={() => i18n.changeLanguage('ar')} style={{ flex: 1, padding: '4px 0', background: i18n.language === 'ar' ? 'rgba(246,188,89,0.2)' : 'transparent', border: '1px solid rgba(246,188,89,0.3)', borderRadius: 6, color: '#fff', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>عربية</button>
                            </div>
                        )}
                        {collapsed && (
                            <button onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr')} title="Changer de langue" style={{
                                width: '100%', marginBottom: 8, padding: '8px 0', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                            }}>
                                <Globe size={15} />
                            </button>
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
                        width: 24, height: 24, background: '#14141c', border: '1px solid rgba(246,188,89,0.12)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-secondary)',
                    }}>
                        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                    </button>
                </aside>

                {/* ── Main View ─────────────────────────────────────────────── */}
                <main style={{
                    flex: 1, minWidth: 0,
                    overflow: isMapPage ? 'hidden' : 'auto',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                }}>
                    {/* Floating "restore sidebar" button — only when map is full-width */}
                    {isMapPage && mapExpanded && (
                        <button className="desktop-only"
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
                                alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                            }}
                        >
                            <PanelLeftOpen size={15} />
                        </button>
                    )}
                    
                    {children}

                    {/* ── Mobile Menu Overlay ── */}
                    {mobileMenuOpen && (
                        <div className="mobile-only" style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(8,8,12,0.95)', backdropFilter: 'blur(8px)',
                            zIndex: 100, display: 'flex', flexDirection: 'column',
                            padding: '40px 24px',
                            animation: 'fade-in 0.2s ease-out'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1e1e2c', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(246,188,89,0.3)' }}>
                                    <ShieldCheck size={20} color="#F6BC59" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{user.username}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role} Tiger Club</div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {secondaryMobileNav.map(({ href, icon: Icon, id }) => (
                                    <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} style={{
                                        display: 'flex', alignItems: 'center', gap: 16,
                                        padding: '16px', background: 'var(--bg-card)',
                                        borderRadius: 12, border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500,
                                    }}>
                                        <Icon size={20} color="var(--gold)" />
                                        {t(`nav.${id}`)}
                                    </Link>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 'auto', marginBottom: 16 }}>
                                <button onClick={() => i18n.changeLanguage('fr')} style={{ flex: 1, padding: '12px', background: i18n.language === 'fr' ? 'rgba(246,188,89,0.2)' : 'var(--bg-card)', border: '1px solid rgba(246,188,89,0.3)', borderRadius: 12, color: '#fff', fontSize: '1rem', cursor: 'pointer', fontWeight: 600 }}>Français</button>
                                <button onClick={() => i18n.changeLanguage('ar')} style={{ flex: 1, padding: '12px', background: i18n.language === 'ar' ? 'rgba(246,188,89,0.2)' : 'var(--bg-card)', border: '1px solid rgba(246,188,89,0.3)', borderRadius: 12, color: '#fff', fontSize: '1rem', cursor: 'pointer', fontWeight: 600 }}>عربية</button>
                            </div>

                            <button onClick={handleLogout} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 10, padding: '18px', background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12,
                                color: '#ef4444', fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
                            }}>
                                <LogOut size={18} /> Déconnexion
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* ── Mobile Bottom Navigation ─────────────────────────────────── */}
            <nav className="mobile-only" style={{
                background: 'linear-gradient(0deg, #0A0A12 0%, #0E0E16 100%)',
                borderTop: '1px solid rgba(246,188,89,0.1)',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '10px 8px',
                paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
                zIndex: 110,
            }}>
                {primaryMobileNav.map(({ href, icon: Icon, id }) => {
                    const active = pathname.startsWith(href);
                    return (
                        <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            color: active ? '#F6BC59' : 'var(--text-muted)',
                            textDecoration: 'none', padding: '6px 12px',
                        }}>
                            <Icon size={22} style={{ filter: active ? 'drop-shadow(0 0 8px rgba(246,188,89,0.4))' : 'none' }} />
                            <span style={{ fontSize: '0.65rem', fontWeight: active ? 600 : 400 }}>{t(`nav.${id}`)}</span>
                        </Link>
                    )
                })}
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    color: mobileMenuOpen ? '#F6BC59' : 'var(--text-muted)',
                    background: 'transparent', border: 'none', padding: '6px 12px', cursor: 'pointer'
                }}>
                    <LayoutGrid size={22} style={{ filter: mobileMenuOpen ? 'drop-shadow(0 0 8px rgba(246,188,89,0.4))' : 'none' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: mobileMenuOpen ? 600 : 400 }}>Menu</span>
                </button>
            </nav>

        </div>
    );
}
