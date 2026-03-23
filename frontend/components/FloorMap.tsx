'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
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
   Cleaner 3-stop gradients per zone. Dark-on-light for Orange/White,
   light-on-dark for Teal/Purple/Grey. Reserved & occupied are distinct.
   ═══════════════════════════════════════════════════════════════════════════ */

const FREE_STOPS: Record<string, (number | string)[]> = {
    Orange: [0, '#FFA880', 0.45, '#F37950', 1, '#C84820'], // Exact requested F37950
    Teal:   [0, '#50DFC8', 0.45, '#1B9684', 1, '#0F6B5C'], // Exact requested 1B9684
    Grey:   [0, '#B8B8C4', 0.45, '#7A7A8A', 1, '#484858'],
    Purple: [0, '#B0588A', 0.45, '#7C3360', 1, '#4A1A35'], // Exact requested 7C3360
    White:  [0, '#FFF0D0', 0.45, '#F6BC59', 1, '#C08820'], // Exact requested F6BC59 for stools
};

const RESERVED_STOPS: (number | string)[] = [0, '#FF7878', 0.45, '#E83838', 1, '#A01818'];
const OCCUPIED_STOPS: (number | string)[] = [0, '#FFD060', 0.45, '#D89718', 1, '#986808'];
const LINKED_STOPS:   (number | string)[] = [0, '#FFE4A0', 0.45, '#F6BC59', 1, '#C08820'];

function getStops(status: string, zone: string, linked: boolean): (number | string)[] {
    if (linked) return LINKED_STOPS;
    if (status === 'reserved') return RESERVED_STOPS;
    if (status === 'occupied') return OCCUPIED_STOPS;
    return FREE_STOPS[zone] ?? FREE_STOPS.Orange;
}

/* Stroke colour — zone-aware for free, semantic for states */
function getStroke(status: string, zone: string, linked: boolean, hovered: boolean): string {
    if (linked)  return '#FFD685';
    if (hovered) return '#FFFFFF';
    if (status === 'reserved') return '#FF5050';
    if (status === 'occupied') return '#FFB838';
    const map: Record<string, string> = {
        Orange: '#F6BC59', Teal: '#50DFC8',
        Grey: '#9898A8', Purple: '#B0588A', White: '#F6BC59',
    };
    return map[zone] ?? '#F6BC59';
}

/* Text colour — ensure contrast on each background */
function getTextFill(status: string, zone: string): string {
    if (status === 'reserved') return '#FFFFFF';
    if (status === 'occupied') return '#1A0800';
    if (zone === 'Purple' || zone === 'Teal') return '#FFFFFF';
    return '#1A0A00';
}

/* Status emoji for hover tooltip */
function getStatusLabel(status: string): string {
    if (status === 'reserved') return '● Réservée';
    if (status === 'occupied') return '● Occupée';
    return '● Libre';
}
function getStatusColor(status: string): string {
    if (status === 'reserved') return '#FF5050';
    if (status === 'occupied') return '#FFB838';
    return '#50D880';
}

export default function FloorMap({ tables, onTableClick }: FloorMapProps) {
    const { linkMode, linkedTables, addLinkedTable, removeLinkedTable } = useAppStore();
    const containerRef  = useRef<HTMLDivElement>(null);
    const lastDist      = useRef(0);
    const lastCenter    = useRef<{ x: number; y: number } | null>(null);
    const isDragging    = useRef(false);

    const [viewport, setViewport] = useState({ w: 800, h: 600 });
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos]     = useState({ x: 0, y: 0 });
    const [hoveredId, setHoveredId]   = useState<number | null>(null);

    const BAR_H = 58;

    const fitMap = useCallback((vw: number, vh: number) => {
        const availH = vh - BAR_H;
        const s = Math.min(vw / CANVAS_W, availH / CANVAS_H);
        const scale = Math.max(s, MIN_SCALE);
        const finalW = CANVAS_W * scale;
        const finalH = CANVAS_H * scale;
        setStageScale(scale);
        setStagePos({
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
        const ro = new ResizeObserver(update);
        if (containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', update);
        return () => { ro.disconnect(); window.removeEventListener('resize', update); };
    }, [fitMap]);

    const clampPos = (x: number, y: number, scale: number, vw: number, vh: number) => {
        const margin = 60;
        const cw = CANVAS_W * scale;
        const ch = CANVAS_H * scale;
        return {
            x: Math.min(vw - margin, Math.max(margin - cw, x)),
            y: Math.min(vh - margin, Math.max(BAR_H - ch + margin, y)),
        };
    };

    const zoomTo = (newScale: number, pivotX: number, pivotY: number) => {
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        setStageScale((prev: number) => {
            const ratio = newScale / prev;
            setStagePos((pos: { x: number; y: number }) => {
                const nx = pivotX - (pivotX - pos.x) * ratio;
                const ny = pivotY - (pivotY - pos.y) * ratio;
                return clampPos(nx, ny, newScale, viewport.w, viewport.h);
            });
            return newScale;
        });
    };

    const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = e.target.getStage()!;
        const ptr   = stage.getPointerPosition()!;
        const factor = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12;
        zoomTo(stageScale * factor, ptr.x, ptr.y);
    };

    const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
        const touches = e.evt.touches;
        if (touches.length !== 2) { lastDist.current = 0; lastCenter.current = null; return; }
        e.evt.preventDefault();
        const t0 = touches[0], t1 = touches[1];
        const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cx = (t0.clientX + t1.clientX) / 2;
        const cy = (t0.clientY + t1.clientY) / 2;
        if (lastDist.current > 0) zoomTo(stageScale * (dist / lastDist.current), cx, cy);
        lastDist.current = dist;
        lastCenter.current = { x: cx, y: cy };
    };

    const handleTouchEnd = () => { lastDist.current = 0; lastCenter.current = null; };

    const handleDragStart = () => { isDragging.current = true; };
    const handleDragEnd   = (e: KonvaEventObject<DragEvent>) => {
        isDragging.current = false;
        const clamped = clampPos(e.target.x(), e.target.y(), stageScale, viewport.w, viewport.h);
        e.target.position(clamped);
        setStagePos(clamped);
    };

    const handleClick = (table: TableStatus) => {
        if (isDragging.current) return;
        if (linkMode) {
            linkedTables.includes(table.id) ? removeLinkedTable(table.id) : addLinkedTable(table.id);
            return;
        }
        onTableClick(table);
    };

    const canvasCx = () => Math.min(Math.max(stagePos.x + (CANVAS_W * stageScale) / 2, 0), viewport.w);
    const canvasCy = () => Math.min(Math.max(stagePos.y + (CANVAS_H * stageScale) / 2, 0), viewport.h);
    const zoomIn   = () => zoomTo(stageScale * 1.25, canvasCx(), canvasCy());
    const zoomOut  = () => zoomTo(stageScale / 1.25, canvasCx(), canvasCy());
    const resetZoom = () => fitAll(viewport.w, viewport.h);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#060608', position: 'relative', overflow: 'hidden' }}>

            <Stage
                width={viewport.w}
                height={viewport.h}
                scaleX={stageScale}
                scaleY={stageScale}
                x={stagePos.x}
                y={stagePos.y}
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onWheel={handleWheel}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ display: 'block', cursor: 'grab' }}
            >
                <Layer>

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
                        shadowColor="rgba(246,188,89,0.7)" shadowBlur={30} />

                    {/* ── Stage horizontal ────────────────────────────────── */}
                    <Rect x={150} y={260} width={780} height={100}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: 0, y: 100 }}
                        fillLinearGradientColorStops={[0, '#262018', 0.5, '#141008', 1, '#0A0806']}
                        stroke="#F6BC59" strokeWidth={3} cornerRadius={5} />
                    <Text x={150} y={288} width={780} text="STAGE"
                        fontSize={40} fontStyle="bold" fill="#F6BC59" align="center"
                        fontFamily="Georgia, serif" letterSpacing={14}
                        shadowColor="rgba(246,188,89,0.9)" shadowBlur={20} />

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
                        shadowColor="rgba(246,188,89,0.5)" shadowBlur={32} />
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
                    {/* VIP zone highlight */}
                    <Rect x={20} y={1570} width={200} height={250}
                        fill="rgba(155,64,232,0.04)" stroke="rgba(155,64,232,0.08)"
                        strokeWidth={1} cornerRadius={12} />
                    {/* Teal zone — around piste area */}
                    <Rect x={210} y={600} width={730} height={860}
                        fill="rgba(29,184,128,0.025)" stroke="rgba(29,184,128,0.06)"
                        strokeWidth={1} cornerRadius={12} />

                    {/* ── Tables ───────────────────────────────────────────── */}
                    {tables.map((table) => {
                        const { x, y, w, h } = table.coordinates;
                        const isLinked  = linkedTables.includes(table.id);
                        const isHovered = hoveredId === table.id;
                        const isSmall   = w <= 80;
                        const stops       = getStops(table.status, table.zone_type, isLinked);
                        const strokeColor = getStroke(table.status, table.zone_type, isLinked, isHovered);
                        const strokeW     = isLinked ? 2.5 : isHovered ? 2 : 1;
                        const radius      = isSmall ? 6 : 14;
                        const fontSize    = isSmall ? 16 : (w >= 180 ? 26 : 21);
                        const textFill    = isLinked ? '#1A0A00' : getTextFill(table.status, table.zone_type);

                        // Glow colour based on state
                        const glowColor = isLinked ? 'rgba(246,188,89,0.6)'
                            : table.status === 'reserved' ? 'rgba(232,56,56,0.3)'
                            : table.status === 'occupied' ? 'rgba(216,151,24,0.25)'
                            : 'transparent';

                        return (
                            <Group
                                key={table.id}
                                x={x} y={y}
                                onMouseEnter={() => setHoveredId(table.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => handleClick(table)}
                                onTap={() => handleClick(table)}
                            >
                                {/* Ambient glow for reserved/occupied */}
                                {(table.status !== 'free' || isLinked) && (
                                    <Rect x={-4} y={-4} width={w + 8} height={h + 8}
                                        fill="transparent"
                                        cornerRadius={radius + 4}
                                        shadowColor={glowColor} shadowBlur={16} />
                                )}

                                {/* Hover ring */}
                                {(isHovered || isLinked) && (
                                    <Rect x={-5} y={-5} width={w + 10} height={h + 10}
                                        fill="transparent"
                                        stroke={isLinked ? '#FFD685' : 'rgba(255,255,255,0.50)'}
                                        strokeWidth={isLinked ? 2.5 : 1.5}
                                        cornerRadius={radius + 5} />
                                )}

                                {/* Drop shadow */}
                                <Rect x={2} y={3} width={w} height={h}
                                    fill="rgba(0,0,0,0.35)" cornerRadius={radius} />

                                {/* Main table face */}
                                <Rect width={w} height={h}
                                    fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                                    fillLinearGradientEndPoint={{ x: 0, y: h }}
                                    fillLinearGradientColorStops={stops}
                                    stroke={strokeColor} strokeWidth={strokeW}
                                    cornerRadius={radius}
                                    shadowColor={glowColor}
                                    shadowBlur={isLinked || isHovered ? 14 : (table.status !== 'free' ? 8 : 0)} />

                                {/* Inner top highlight — 1px light line for depth */}
                                {!isSmall && (
                                    <Rect x={3} y={2} width={w - 6} height={1.5}
                                        fill="rgba(255,255,255,0.25)"
                                        cornerRadius={1} />
                                )}

                                {/* Table number label */}
                                <Text width={w} height={h} text={table.table_number}
                                    fontSize={fontSize}
                                    fontStyle="bold"
                                    fill={textFill}
                                    align="center" verticalAlign="middle"
                                    fontFamily="'Montserrat', sans-serif"
                                    shadowColor={
                                        textFill === '#FFFFFF' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.3)'
                                    }
                                    shadowBlur={2}
                                    shadowOffsetX={0}
                                    shadowOffsetY={1} />

                                {/* Hover tooltip — shows status + capacity */}
                                {isHovered && !isSmall && (
                                    <Group x={0} y={-32}>
                                        <Rect x={0} y={0} width={w} height={24}
                                            fill="rgba(8,6,12,0.92)"
                                            stroke="rgba(246,188,89,0.20)"
                                            strokeWidth={1}
                                            cornerRadius={6} />
                                        <Circle x={8} y={12} radius={3}
                                            fill={getStatusColor(table.status)} />
                                        <Text x={16} y={4} width={w - 20} height={18}
                                            text={`${getStatusLabel(table.status)}  ×${table.capacity}`}
                                            fontSize={10} fill="#C8C0B0"
                                            fontFamily="'Outfit', sans-serif" />
                                    </Group>
                                )}
                            </Group>
                        );
                    })}

                </Layer>
            </Stage>

            {/* ── Zoom controls (bottom-right) ─────────────────────────── */}
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
                    {Math.round(stageScale * 100)}%
                </div>
            </div>
        </div>
    );
}
