'use client';
import { memo, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Circle, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { TableStatus, useAppStore } from '@/lib/store';

interface FloorMapProps {
    tables: TableStatus[];
    onTableClick: (table: TableStatus) => void;
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const MIN_SCALE = 0.15;
const MAX_SCALE = 3.0;

/* ═══════════════════════════════════════════════════════════════════════════
   COLOUR SYSTEM
   Orange = Libre, Grey = Stage area, Red = Piste area,
   Green = Réservé, Purple = VIP.
   ═══════════════════════════════════════════════════════════════════════════ */

const FREE_STOPS: Record<string, (number | string)[]> = {
    Orange: [0, '#FFA880', 0.45, '#F37950', 1, '#C84820'],
    Teal:   [0, '#FF7878', 0.45, '#E83838', 1, '#A01818'], // Piste tables → Red
    Grey:   [0, '#B8B8C4', 0.45, '#7A7A8A', 1, '#484858'], // Stage tables → Grey restored
    Purple: [0, '#B0588A', 0.45, '#7C3360', 1, '#4A1A35'], // VIP purple
    White:  [0, '#FFF0D0', 0.45, '#F6BC59', 1, '#C08820'], // Stools
};

const RESERVED_STOPS: (number | string)[] = [0, '#50DFC8', 0.45, '#1B9684', 1, '#0F6B5C']; // Green
const OCCUPIED_STOPS: (number | string)[] = [0, '#FFD060', 0.45, '#D89718', 1, '#986808']; // Warm amber
const LINKED_STOPS:   (number | string)[] = [0, '#FFE4A0', 0.45, '#F6BC59', 1, '#C08820'];

function getStops(status: string, zone: string, linked: boolean): (number | string)[] {
    if (linked) return LINKED_STOPS;
    if (status === 'reserved') return RESERVED_STOPS;
    if (status === 'occupied') return OCCUPIED_STOPS;
    return FREE_STOPS[zone] ?? FREE_STOPS.Orange;
}

/* Stroke colour */
function getStroke(status: string, zone: string, linked: boolean, hovered: boolean): string {
    if (linked)  return '#FFD685';
    if (hovered) return '#FFFFFF';
    if (status === 'reserved') return '#50DFC8'; // Green stroke for reserved
    if (status === 'occupied') return '#FFB838';
    const map: Record<string, string> = {
        Orange: '#F6BC59', Teal: '#FF5050',
        Grey: '#9898A8', Purple: '#B0588A', White: '#F6BC59',
    };
    return map[zone] ?? '#F6BC59';
}

/* Text colour — ensure contrast */
function getTextFill(status: string, zone: string): string {
    if (status === 'reserved') return '#FFFFFF'; // White text on green
    if (status === 'occupied') return '#1A0800';
    if (zone === 'Purple' || zone === 'Teal' || zone === 'Grey') return '#FFFFFF';
    return '#1A0A00';
}

/* Status tooltip */
function getStatusLabel(status: string): string {
    if (status === 'reserved') return '● Réservée';
    if (status === 'occupied') return '● Occupée';
    return '● Libre';
}
function getStatusColor(status: string): string {
    if (status === 'reserved') return '#1B9684'; // Green
    if (status === 'occupied') return '#FFB838';
    return '#F37950'; // Orange for free
}

interface TableNodeProps {
    table: TableStatus;
    isLinked: boolean;
    isHovered: boolean;
    richEffects: boolean;
    tooltipEnabled: boolean;
    lowPowerMode: boolean;
    onHover: (id: number | null) => void;
    onActivate: (table: TableStatus) => void;
}

const TableNode = memo(function TableNode({
    table,
    isLinked,
    isHovered,
    richEffects,
    tooltipEnabled,
    lowPowerMode,
    onHover,
    onActivate,
}: TableNodeProps) {
    const { x, y, w, h } = table.coordinates;
    const isSmall = w <= 80;
    const stops = getStops(table.status, table.zone_type, isLinked);
    const strokeColor = getStroke(table.status, table.zone_type, isLinked, isHovered);
    const strokeW = isLinked ? 2.5 : isHovered ? 2 : 1;
    const radius = isSmall ? 6 : 14;
    const fontSize = isSmall ? 16 : (w >= 180 ? 26 : 21);
    const textFill = isLinked ? '#1A0A00' : getTextFill(table.status, table.zone_type);

    const glowColor = isLinked
        ? 'rgba(246,188,89,0.6)'
        : table.status === 'reserved'
            ? 'rgba(232,56,56,0.3)'
            : table.status === 'occupied'
                ? 'rgba(216,151,24,0.25)'
                : 'transparent';

    return (
        <Group
            x={x}
            y={y}
            onMouseEnter={() => onHover(table.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onActivate(table)}
            onTap={() => onActivate(table)}
        >
            {(table.status !== 'free' || isLinked) && (
                <Rect
                    x={-4}
                    y={-4}
                    width={w + 8}
                    height={h + 8}
                    fill="transparent"
                    cornerRadius={radius + 4}
                    shadowColor={glowColor}
                    shadowBlur={richEffects ? 16 : 0}
                />
            )}

            {(isHovered || isLinked) && (
                <Rect
                    x={-5}
                    y={-5}
                    width={w + 10}
                    height={h + 10}
                    fill="transparent"
                    stroke={isLinked ? '#FFD685' : 'rgba(255,255,255,0.50)'}
                    strokeWidth={isLinked ? 2.5 : 1.5}
                    cornerRadius={radius + 5}
                />
            )}

            <Rect x={2} y={3} width={w} height={h} fill="rgba(0,0,0,0.35)" cornerRadius={radius} />

            <Rect
                width={w}
                height={h}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: 0, y: h }}
                fillLinearGradientColorStops={stops}
                stroke={strokeColor}
                strokeWidth={strokeW}
                cornerRadius={radius}
                shadowColor={glowColor}
                shadowBlur={richEffects ? (isLinked || isHovered ? 8 : (table.status !== 'free' ? 4 : 0)) : 0}
                perfectDrawEnabled={!lowPowerMode}
            />

            {!isSmall && richEffects && (
                <Rect x={3} y={2} width={w - 6} height={1.5} fill="rgba(255,255,255,0.25)" cornerRadius={1} />
            )}

            <Text
                width={w}
                height={h}
                text={table.table_number}
                fontSize={fontSize}
                fontStyle="bold"
                fill={textFill}
                align="center"
                verticalAlign="middle"
                fontFamily="'Montserrat', sans-serif"
                shadowColor={textFill === '#FFFFFF' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.3)'}
                shadowBlur={2}
                shadowOffsetX={0}
                shadowOffsetY={1}
            />

            {tooltipEnabled && isHovered && !isSmall && (
                <Group x={0} y={-32}>
                    <Rect
                        x={0}
                        y={0}
                        width={w}
                        height={24}
                        fill="rgba(8,6,12,0.92)"
                        stroke="rgba(246,188,89,0.20)"
                        strokeWidth={1}
                        cornerRadius={6}
                    />
                    <Circle x={8} y={12} radius={3} fill={getStatusColor(table.status)} />
                    <Text
                        x={16}
                        y={4}
                        width={w - 20}
                        height={18}
                        text={`${getStatusLabel(table.status)}  ×${table.capacity}`}
                        fontSize={10}
                        fill="#C8C0B0"
                        fontFamily="'Outfit', sans-serif"
                    />
                </Group>
            )}
        </Group>
    );
}, (prev, next) => (
    prev.table === next.table
    && prev.isLinked === next.isLinked
    && prev.isHovered === next.isHovered
    && prev.onActivate === next.onActivate
    && prev.onHover === next.onHover
));

const StaticMapLayer = memo(function StaticMapLayer() {
    return (
        <Layer listening={false}>
            {/* ══ BACKGROUND ═══════════════════════════════════════════
                Clean atmospheric dark base with warm centre glow
                and edge vignette. No marble veins.
            ═══════════════════════════════════════════════════════════ */}

            {/* 1 · Deep charcoal base */}
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                fillLinearGradientStartPoint={{ x: CANVAS_W * 0.5, y: 0 }}
                fillLinearGradientEndPoint={{ x: CANVAS_W * 0.5, y: CANVAS_H }}
                fillLinearGradientColorStops={[
                    0,    '#141218',
                    0.35, '#0C0A10',
                    0.65, '#0A080E',
                    1,    '#100E16',
                ]}
            />

            {/* 2 · Warm centre glow (PISTE area) */}
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                fillRadialGradientStartPoint={{ x: 551, y: 1029 }}
                fillRadialGradientEndPoint={{ x: 551, y: 1029 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={650}
                fillRadialGradientColorStops={[
                    0,    'rgba(246,188,89,0.12)',
                    0.35, 'rgba(220,155,55,0.06)',
                    0.70, 'rgba(180,115,35,0.02)',
                    1,    'rgba(0,0,0,0)',
                ]}
            />

            {/* 3 · DJ spotlight from top */}
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                fillRadialGradientStartPoint={{ x: CANVAS_W / 2, y: 56 }}
                fillRadialGradientEndPoint={{ x: CANVAS_W / 2, y: 56 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={500}
                fillRadialGradientColorStops={[
                    0,    'rgba(246,188,89,0.10)',
                    0.50, 'rgba(200,140,50,0.04)',
                    1,    'rgba(0,0,0,0)',
                ]}
            />

            {/* 4 · Vignette — darken edges */}
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                fillRadialGradientStartPoint={{ x: CANVAS_W / 2, y: CANVAS_H * 0.42 }}
                fillRadialGradientEndPoint={{ x: CANVAS_W / 2, y: CANVAS_H * 0.42 }}
                fillRadialGradientStartRadius={350}
                fillRadialGradientEndRadius={1050}
                fillRadialGradientColorStops={[
                    0,    'rgba(0,0,0,0)',
                    0.50, 'rgba(0,0,0,0.20)',
                    1,    'rgba(0,0,0,0.65)',
                ]}
            />

            {/* ── Border frame ─────────────────────────────────────── */}
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                fill="transparent" stroke="#18141E" strokeWidth={12} cornerRadius={4} />
            <Rect x={14} y={14} width={CANVAS_W - 28} height={CANVAS_H - 28}
                fill="transparent" stroke="rgba(246,188,89,0.25)" strokeWidth={1.5} cornerRadius={3} />

            {/* ── DJ Booth ─────────────────────────────────────────── */}
            <Rect x={0} y={0} width={CANVAS_W} height={112}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: 0, y: 112 }}
                fillLinearGradientColorStops={[0, '#1E1820', 0.5, '#12101A', 1, '#0A080E']} />
            <Rect x={0} y={108} width={CANVAS_W} height={4}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: CANVAS_W, y: 0 }}
                fillLinearGradientColorStops={[0, 'transparent', 0.12, '#F6BC59', 0.5, '#FFD685', 0.88, '#F6BC59', 1, 'transparent']} />
            <Text x={0} y={20} width={CANVAS_W} text="DJ"
                fontSize={58} fontStyle="bold" fill="#F6BC59" align="center"
                fontFamily="'Montserrat', sans-serif" letterSpacing={30}
                shadowColor="rgba(246,188,89,0.5)" shadowBlur={12} />

            {/* ── Stage horizontal ────────────────────────────────── */}
            <Rect x={150} y={260} width={780} height={100}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: 0, y: 100 }}
                fillLinearGradientColorStops={[0, '#262018', 0.5, '#141008', 1, '#0A0806']}
                stroke="#F6BC59" strokeWidth={3} cornerRadius={5} />
            <Text x={150} y={288} width={780} text="STAGE"
                fontSize={40} fontStyle="bold" fill="#F6BC59" align="center"
                fontFamily="Georgia, serif" letterSpacing={14}
                shadowColor="rgba(246,188,89,0.7)" shadowBlur={10} />

            {/* ── Stage vertical ──────────────────────────────────── */}
            <Rect x={460} y={380} width={160} height={340}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: 160, y: 0 }}
                fillLinearGradientColorStops={[0, '#262018', 0.5, '#141008', 1, '#262018']}
                stroke="#F6BC59" strokeWidth={3} />
            <Text x={555} y={485} width={131} text="STAGE"
                fontSize={25} fontStyle="bold" fill="#F6BC59" align="center"
                rotation={90} fontFamily="Georgia, serif" letterSpacing={7}
                shadowColor="rgba(246,188,89,0.9)" shadowBlur={14} />

            {/* ── Piste ───────────────────────────────────────────── */}
            <Rect x={340} y={860} width={400} height={220}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: 0, y: 220 }}
                fillLinearGradientColorStops={[0, '#262018', 0.5, '#141008', 1, '#0A0806']}
                stroke="#F6BC59" strokeWidth={3} />
            <Rect x={342} y={862} width={396} height={2} fill="rgba(246,188,89,0.40)" />
            <Rect x={342} y={1076} width={396} height={2} fill="rgba(246,188,89,0.40)" />
            <Text x={406} y={915} width={100} text="PISTE"
                fontSize={23} fontStyle="bold" fill="#F6BC59"
                align="center" rotation={90} fontFamily="Georgia, serif" letterSpacing={5}
                shadowColor="rgba(246,188,89,0.9)" shadowBlur={14} />
            <Text x={697} y={915} width={100} text="PISTE"
                fontSize={23} fontStyle="bold" fill="#F6BC59"
                align="center" rotation={90} fontFamily="Georgia, serif" letterSpacing={5}
                shadowColor="rgba(246,188,89,0.9)" shadowBlur={14} />
            <Circle x={540} y={970} radius={65}
                fillLinearGradientStartPoint={{ x: -65, y: -65 }}
                fillLinearGradientEndPoint={{ x: 65, y: 65 }}
                fillLinearGradientColorStops={[0, '#302818', 0.5, '#1E1810', 1, '#0E0C08']}
                stroke="#F6BC59" strokeWidth={4}
                shadowColor="rgba(246,188,89,0.4)" shadowBlur={14} />
            <Circle x={540} y={970} radius={56}
                fill="transparent" stroke="rgba(246,188,89,0.30)" strokeWidth={2} />
            <Text x={474} y={956} width={131} text="TIGER"
                fontSize={24} fontStyle="bold" fill="#F6BC59" align="center"
                fontFamily="'Montserrat', sans-serif" letterSpacing={6}
                shadowColor="rgba(246,188,89,0.8)" shadowBlur={18} />

            {/* ── Red accent dividers ───────────────────────────────── */}
            <Rect x={171} y={740} width={45} height={3} fill="#dc2626" cornerRadius={2}
                shadowColor="#dc2626" shadowBlur={6} />
            <Rect x={887} y={1570} width={45} height={7} fill="#dc2626" cornerRadius={2}
                shadowColor="#dc2626" shadowBlur={6} />

            {/* ── Zone ground-plane cues ────────────────────────────── */}
            <Rect x={20} y={1570} width={200} height={250}
                fill="rgba(155,64,232,0.04)" stroke="rgba(155,64,232,0.08)"
                strokeWidth={1} cornerRadius={12} />
            <Rect x={210} y={600} width={730} height={860}
                fill="rgba(29,184,128,0.025)" stroke="rgba(29,184,128,0.06)"
                strokeWidth={1} cornerRadius={12} />
        </Layer>
    );
});

const LiteStaticMapLayer = memo(function LiteStaticMapLayer() {
    return (
        <Layer listening={false}>
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                fillLinearGradientStartPoint={{ x: CANVAS_W * 0.5, y: 0 }}
                fillLinearGradientEndPoint={{ x: CANVAS_W * 0.5, y: CANVAS_H }}
                fillLinearGradientColorStops={[0, '#121018', 0.55, '#0B0910', 1, '#0E0C14']}
            />
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                fillRadialGradientStartPoint={{ x: 551, y: 1029 }}
                fillRadialGradientEndPoint={{ x: 551, y: 1029 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={560}
                fillRadialGradientColorStops={[0, 'rgba(246,188,89,0.08)', 1, 'rgba(0,0,0,0)']}
            />

            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                fill="transparent" stroke="#18141E" strokeWidth={10} cornerRadius={4} />

            <Rect x={0} y={0} width={CANVAS_W} height={104}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: 0, y: 104 }}
                fillLinearGradientColorStops={[0, '#1A1620', 1, '#0A080E']} />
            <Text x={0} y={20} width={CANVAS_W} text="DJ"
                fontSize={52} fontStyle="bold" fill="#F6BC59" align="center"
                fontFamily="'Montserrat', sans-serif" letterSpacing={22} />

            <Rect x={150} y={260} width={780} height={100}
                fill="#141008" stroke="#F6BC59" strokeWidth={2.5} cornerRadius={5} />
            <Text x={150} y={288} width={780} text="STAGE"
                fontSize={36} fontStyle="bold" fill="#F6BC59" align="center"
                fontFamily="Georgia, serif" letterSpacing={10} />

            <Rect x={460} y={380} width={160} height={340}
                fill="#141008" stroke="#F6BC59" strokeWidth={2.5} />

            <Rect x={340} y={860} width={400} height={220}
                fill="#141008" stroke="#F6BC59" strokeWidth={2.5} />
            <Circle x={540} y={970} radius={58}
                fill="#1A140D" stroke="#F6BC59" strokeWidth={3} />
            <Text x={474} y={956} width={131} text="TIGER"
                fontSize={22} fontStyle="bold" fill="#F6BC59" align="center"
                fontFamily="'Montserrat', sans-serif" letterSpacing={4} />
        </Layer>
    );
});

export default function FloorMap({ tables, onTableClick }: FloorMapProps) {
    const linkMode = useAppStore((state) => state.linkMode);
    const linkedTables = useAppStore((state) => state.linkedTables);
    const addLinkedTable = useAppStore((state) => state.addLinkedTable);
    const removeLinkedTable = useAppStore((state) => state.removeLinkedTable);

    const containerRef = useRef<HTMLDivElement>(null);
    const lastDist = useRef(0);
    const isDragging = useRef(false);

    const [viewport, setViewport] = useState({ w: 800, h: 600 });
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const hasResizeObserver = typeof window !== 'undefined' && 'ResizeObserver' in window;

    const BAR_H = 58;

    const fitMap = useCallback((vw: number, vh: number) => {
        const availH = vh - BAR_H;
        const s = Math.min(vw / CANVAS_W, availH / CANVAS_H);
        const scale = Math.max(s, MIN_SCALE);
        const finalW = CANVAS_W * scale;
        const finalH = CANVAS_H * scale;
        setTransform({
            scale,
            x: (vw - finalW) / 2,
            y: BAR_H + (availH - finalH) / 2,
        });
    }, []);

    const fitAll = fitMap;

    useEffect(() => {
        const update = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            if (!w || !h) return;
            setViewport({ w, h });
            fitMap(w, h);
        };
        update();
        let ro: ResizeObserver | null = null;
        if (hasResizeObserver) {
            ro = new ResizeObserver(update);
            if (containerRef.current) ro.observe(containerRef.current);
        }
        window.addEventListener('resize', update);
        return () => {
            if (ro) ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [fitMap, hasResizeObserver]);

    const clampPos = useCallback((x: number, y: number, scale: number, vw: number, vh: number) => {
        const margin = 60;
        const cw = CANVAS_W * scale;
        const ch = CANVAS_H * scale;
        return {
            x: Math.min(vw - margin, Math.max(margin - cw, x)),
            y: Math.min(vh - margin, Math.max(BAR_H - ch + margin, y)),
        };
    }, []);

    const zoomTo = useCallback((targetScale: number, pivotX: number, pivotY: number) => {
        setTransform((current) => {
            const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));
            if (Math.abs(nextScale - current.scale) < 0.0001) return current;

            const ratio = nextScale / current.scale;
            const nx = pivotX - (pivotX - current.x) * ratio;
            const ny = pivotY - (pivotY - current.y) * ratio;
            const clamped = clampPos(nx, ny, nextScale, viewport.w, viewport.h);
            return { scale: nextScale, x: clamped.x, y: clamped.y };
        });
    }, [clampPos, viewport.h, viewport.w]);

    const zoomBy = useCallback((factor: number, pivotX: number, pivotY: number) => {
        setTransform((current) => {
            const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.scale * factor));
            if (Math.abs(nextScale - current.scale) < 0.0001) return current;

            const ratio = nextScale / current.scale;
            const nx = pivotX - (pivotX - current.x) * ratio;
            const ny = pivotY - (pivotY - current.y) * ratio;
            const clamped = clampPos(nx, ny, nextScale, viewport.w, viewport.h);
            return { scale: nextScale, x: clamped.x, y: clamped.y };
        });
    }, [clampPos, viewport.h, viewport.w]);

    const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = e.target.getStage()!;
        const ptr = stage.getPointerPosition()!;
        const factor = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12;
        zoomBy(factor, ptr.x, ptr.y);
    }, [zoomBy]);

    const handleTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
        const touches = e.evt.touches;
        if (touches.length !== 2) {
            lastDist.current = 0;
            return;
        }
        e.evt.preventDefault();
        const t0 = touches[0], t1 = touches[1];
        const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cx = (t0.clientX + t1.clientX) / 2;
        const cy = (t0.clientY + t1.clientY) / 2;
        if (lastDist.current > 0) {
            zoomBy(dist / lastDist.current, cx, cy);
        }
        lastDist.current = dist;
    }, [zoomBy]);

    const handleTouchEnd = useCallback(() => {
        lastDist.current = 0;
    }, []);

    const handleDragStart = useCallback(() => {
        isDragging.current = true;
    }, []);

    const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
        isDragging.current = false;
        const clamped = clampPos(
            e.target.x(),
            e.target.y(),
            transform.scale,
            viewport.w,
            viewport.h,
        );
        e.target.position(clamped);
        setTransform((current) => ({ ...current, x: clamped.x, y: clamped.y }));
    }, [clampPos, transform.scale, viewport.h, viewport.w]);

    const linkedSet = useMemo(() => new Set(linkedTables), [linkedTables]);

    const handleActivateTable = useCallback((table: TableStatus) => {
        if (isDragging.current) return;
        if (linkMode) {
            if (linkedSet.has(table.id)) {
                removeLinkedTable(table.id);
            } else {
                addLinkedTable(table.id);
            }
            return;
        }
        onTableClick(table);
    }, [linkMode, linkedSet, removeLinkedTable, addLinkedTable, onTableClick]);

    const handleHover = useCallback((id: number | null) => {
        setHoveredId((prev) => (prev === id ? prev : id));
    }, []);

    const lowPowerMode = viewport.w <= 1024 || viewport.h <= 900 || !hasResizeObserver;
    const richEffects = !lowPowerMode && transform.scale > 0.35;
    const tooltipEnabled = !lowPowerMode && transform.scale > 0.6;

    const canvasCx = useCallback(
        () => Math.min(Math.max(transform.x + (CANVAS_W * transform.scale) / 2, 0), viewport.w),
        [transform, viewport.w],
    );
    const canvasCy = useCallback(
        () => Math.min(Math.max(transform.y + (CANVAS_H * transform.scale) / 2, 0), viewport.h),
        [transform, viewport.h],
    );
    const zoomIn = useCallback(() => {
        zoomTo(transform.scale * 1.25, canvasCx(), canvasCy());
    }, [transform.scale, canvasCx, canvasCy, zoomTo]);
    const zoomOut = useCallback(() => {
        zoomTo(transform.scale / 1.25, canvasCx(), canvasCy());
    }, [transform.scale, canvasCx, canvasCy, zoomTo]);
    const resetZoom = useCallback(() => {
        fitAll(viewport.w, viewport.h);
    }, [fitAll, viewport.h, viewport.w]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#060608', position: 'relative', overflow: 'hidden' }}>

            <Stage
                width={viewport.w}
                height={viewport.h}
                scaleX={transform.scale}
                scaleY={transform.scale}
                x={transform.x}
                y={transform.y}
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onWheel={handleWheel}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                listening
                style={{ display: 'block', cursor: 'grab' }}
            >
                {lowPowerMode ? <LiteStaticMapLayer /> : <StaticMapLayer />}
                <Layer>
                    {tables.map((table) => (
                        <TableNode
                            key={table.id}
                            table={table}
                            isLinked={linkedSet.has(table.id)}
                            isHovered={hoveredId === table.id}
                            richEffects={richEffects}
                            tooltipEnabled={tooltipEnabled}
                            lowPowerMode={lowPowerMode}
                            onHover={handleHover}
                            onActivate={handleActivateTable}
                        />
                    ))}
                </Layer>
            </Stage>

            {/* ── Zoom controls (bottom-right) ──────────────────────── */}
            <div style={{
                position: 'absolute', bottom: 18, right: 18,
                display: 'flex', flexDirection: 'column', gap: 5,
                zIndex: 10,
            }}>
                {[
                    { label: '+', action: zoomIn, title: 'Zoom avant' },
                    { label: '⊙', action: resetZoom, title: 'Réinitialiser' },
                    { label: '−', action: zoomOut, title: 'Zoom arrière' },
                ].map(({ label, action, title }) => (
                    <button key={label} onClick={action} title={title}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        style={{
                            width: 40, height: 40,
                            background: 'rgba(10,8,14,0.90)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(246,188,89,0.22)',
                            borderRadius: 10,
                            color: '#F6BC59',
                            fontSize: label === '⊙' ? '1rem' : '1.3rem',
                            fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1,
                            boxShadow: '0 3px 14px rgba(0,0,0,0.5)',
                            transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={e => {
                            (e.target as HTMLButtonElement).style.borderColor = 'rgba(246,188,89,0.50)';
                            (e.target as HTMLButtonElement).style.background = 'rgba(20,16,28,0.95)';
                        }}
                        onMouseLeave={e => {
                            (e.target as HTMLButtonElement).style.borderColor = 'rgba(246,188,89,0.22)';
                            (e.target as HTMLButtonElement).style.background = 'rgba(10,8,14,0.90)';
                        }}
                    >
                        {label}
                    </button>
                ))}
                <div style={{
                    textAlign: 'center', fontSize: '0.6rem', color: 'rgba(246,188,89,0.35)',
                    marginTop: 2, userSelect: 'none', fontFamily: "'Outfit', sans-serif",
                }}>
                    {Math.round(transform.scale * 100)}%
                </div>
            </div>
        </div>
    );
}
