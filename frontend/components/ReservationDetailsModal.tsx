'use client';
import { useState } from 'react';
import { X, User, Phone, DollarSign, Calendar, AlertCircle, FileText, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface Reservation {
    id: number;
    table_ids: number[];
    table_numbers: string[];
    customer_name: string;
    customer_phone: string;
    total_price: number;
    advance_paid: number;
    payment_method: string;
    date_reservation: string;
    status: string;
    notes: string;
    operator_name: string | null;
    created_by_username: string;
    created_at: string;
}

interface Props {
    reservation: Reservation;
    onClose: () => void;
}

const getStatusColor = (status: string): { color: string; bg: string } => {
    switch (status) {
        case 'reserved':
            return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
        case 'occupied':
            return { color: '#eab308', bg: 'rgba(234,179,8,0.1)' };
        case 'cancelled':
            return { color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
        default:
            return { color: '#8888a0', bg: 'rgba(136,136,160,0.1)' };
    }
};

export default function ReservationDetailsModal({ reservation, onClose }: Props) {
    const { t } = useTranslation();
    const [expandNotes, setExpandNotes] = useState(false);
    const statusColor = getStatusColor(reservation.status);
    const balance = reservation.total_price - reservation.advance_paid;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const InfoRow = ({ icon: Icon, label, value, color = '#f5e6b8' }: any) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon size={14} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {label}
                </div>
                <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 500 }}>
                    {value}
                </div>
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={s.overlay}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                style={s.modal}
            >
                {/* Header */}
                <div style={s.header}>
                    <div>
                        <h2 style={s.title}>{t('reservationDetails.title')}</h2>
                        <p style={s.subtitle}>{t('reservationDetails.customer')}</p>
                    </div>
                    <button onClick={onClose} style={s.closeBtn}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', paddingBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Status Badge */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: statusColor.bg,
                            border: `1px solid ${statusColor.color}40`,
                            padding: '12px 14px',
                            borderRadius: 10,
                            borderLeft: `3px solid ${statusColor.color}`,
                        }}>
                            <AlertCircle size={14} color={statusColor.color} />
                            <span style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: statusColor.color,
                                textTransform: 'uppercase'
                            }}>
                                {t(`reservations.status.${reservation.status}`)}
                            </span>
                        </div>

                        {/* Customer Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <InfoRow
                                icon={User}
                                label={t('reservationDetails.customerName')}
                                value={reservation.customer_name}
                            />
                            {reservation.customer_phone && (
                                <InfoRow
                                    icon={Phone}
                                    label={t('reservationDetails.phone')}
                                    value={reservation.customer_phone}
                                />
                            )}
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: 'rgba(246,188,89,0.12)' }} />

                        {/* Reservation Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <InfoRow
                                icon={Calendar}
                                label={t('reservationDetails.date')}
                                value={formatDate(reservation.date_reservation)}
                            />
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '0.8rem', color: '#f5e6b8', fontWeight: 700, padding: '4px 10px', background: 'rgba(245,230,184,0.1)', borderRadius: 6, border: '1px solid rgba(245,230,184,0.2)' }}>
                                    {t('reservationDetails.table')} {reservation.table_numbers.join(', ')}
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: 'rgba(246,188,89,0.12)' }} />

                        {/* Pricing */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 0'
                            }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {t('reservationDetails.totalPrice')}
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>
                                    {reservation.total_price.toLocaleString('fr-FR')} DH
                                </span>
                            </div>
                            {reservation.advance_paid > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 0'
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {t('reservationDetails.advancePaid')}
                                    </span>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#60a5fa' }}>
                                        {reservation.advance_paid.toLocaleString('fr-FR')} DH
                                    </span>
                                </div>
                            )}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 0',
                                borderTop: '1px solid rgba(246,188,89,0.12)',
                                marginTop: 8
                            }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {t('reservationDetails.balance')}
                                </span>
                                <span style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: balance > 0 ? '#f97316' : '#22c55e'
                                }}>
                                    {Math.abs(balance).toLocaleString('fr-FR')} DH
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: 'rgba(246,188,89,0.12)' }} />

                        {/* Payment & Meta */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                    {t('reservationDetails.paymentMethod')}
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 12px',
                                    background: reservation.payment_method === 'cash' ? 'rgba(34,197,94,0.1)' : 'rgba(246,188,89,0.1)',
                                    border: `1px solid ${reservation.payment_method === 'cash' ? 'rgba(34,197,94,0.3)' : 'rgba(246,188,89,0.3)'}`,
                                    borderRadius: 8,
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: reservation.payment_method === 'cash' ? '#22c55e' : '#f6bc59'
                                }}>
                                    {t(`reservationModal.payment.${reservation.payment_method}`)}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                    {t('reservationDetails.createdBy')}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#f5e6b8' }}>
                                    {reservation.created_by_username}
                                </div>
                            </div>

                            {reservation.operator_name && (
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                        {t('reservationDetails.operator')}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#c8a84b', fontWeight: 600 }}>
                                        {reservation.operator_name}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {reservation.notes && (
                            <>
                                <div style={{ height: 1, background: 'rgba(246,188,89,0.12)' }} />
                                <div>
                                    <button
                                        onClick={() => setExpandNotes(!expandNotes)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            background: 'none',
                                            border: 'none',
                                            color: '#f5e6b8',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            padding: 0,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                    >
                                        <FileText size={13} />
                                        {t('reservationDetails.notes')}
                                        <ChevronDown
                                            size={14}
                                            style={{
                                                transform: expandNotes ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s'
                                            }}
                                        />
                                    </button>
                                    <AnimatePresence>
                                        {expandNotes && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{
                                                    marginTop: 10,
                                                    padding: '10px 12px',
                                                    background: 'rgba(10,10,16,0.8)',
                                                    border: '1px solid rgba(246,188,89,0.15)',
                                                    borderRadius: 8,
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-secondary)',
                                                    lineHeight: 1.6,
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {reservation.notes}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer - Close Button */}
                <div style={{
                    padding: '16px 0',
                    borderTop: '1px solid rgba(246,188,89,0.12)',
                    display: 'flex',
                    gap: 10
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'rgba(246,188,89,0.1)',
                            border: '1px solid rgba(246,188,89,0.3)',
                            borderRadius: 10,
                            color: '#f6bc59',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.background = 'rgba(246,188,89,0.15)';
                            (e.target as HTMLElement).style.boxShadow = '0 0 12px rgba(246,188,89,0.2)';
                        }}
                        onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.background = 'rgba(246,188,89,0.1)';
                            (e.target as HTMLElement).style.boxShadow = 'none';
                        }}
                    >
                        {t('common.close')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
    },
    modal: {
        position: 'relative',
        width: '90%',
        maxWidth: 480,
        maxHeight: '85vh',
        background: 'linear-gradient(135deg, rgba(15,12,20,0.95) 0%, rgba(20,18,28,0.95) 100%)',
        border: '1px solid rgba(246,188,89,0.2)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(246,188,89,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 20,
        padding: '24px 24px 16px',
        borderBottom: '1px solid rgba(246,188,89,0.12)',
        flexShrink: 0,
    },
    title: {
        margin: 0,
        fontSize: '1.35rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '0.03em',
    },
    subtitle: {
        margin: '4px 0 0',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    closeBtn: {
        background: 'rgba(246,188,89,0.08)',
        border: '1px solid rgba(246,188,89,0.2)',
        borderRadius: 8,
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f6bc59',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.2s',
    },
};
