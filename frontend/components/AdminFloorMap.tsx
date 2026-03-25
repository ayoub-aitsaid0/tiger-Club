'use client';
import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Circle, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AdminTable {
    id: number;
    table_number: string;
    zone_type: string;
    capacity: number;
    coordinates: { x: number; y: number; w: number; h: number };
}

export interface NewTableDraft {
    table_number: string;
    zone_type: string;
    w: number;
    h: number;
}

interface AdminFloorMapProps {
    tables: AdminTable[];
    selectedTableId: number | null;
    placementMode: boolean;
    newTableDraft: NewTableDraft;
    onTableMove: (id: number, x: number, y: number) => void;
    onTableSelect: (table: AdminTable | null) => void;
    onPlaceTable: (x: number, y: number) => void;
    onUserInteract?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CANVAS_W = 1080;
const CANVAS_H = 1920;
const SNAP = 5;

const snap = (v: number) => Math.round(v / SNAP) * SNAP;

const FREE_STOPS: Record<string, (number | string)[]> = {
    Orange: [0, '#FFA880', 0.45, '#F37950', 1, '#C84820'], // Exact requested F37950
    Teal:   [0, '#50DFC8', 0.45, '#1B9684', 1, '#0F6B5C'], // Exact requested 1B9684
    Grey:   [0, '#B8B8C4', 0.45, '#7A7A8A', 1, '#484858'],
    Purple: [0, '#B0588A', 0.45, '#7C3360', 1, '#4A1A35'], // Exact requested 7C3360
    White:  [0, '#FFF0D0', 0.45, '#F6BC59', 1, '#C08820'], // Exact requested F6BC59 for stools
};

const GHOST_FILL: Record<string, string> = {
    Orange: '#F37950', Teal: '#1B9684', Grey: '#7A7A8A',
    Purple: '#7C3360', White: '#F6BC59',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminFloorMap({
    tables, selectedTableId, placementMode, newTableDraft,
    onTableMove, onTableSelect, onPlaceTable, onUserInteract,
}: AdminFloorMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
    const [viewport, setViewport] = useState({ w: 0, h: 0 });
    const hasResizeObserver = typeof window !== 'undefined' && 'ResizeObserver' in window;

    // ── Responsive scaling ────────────────────────────────────────────────────
    useEffect(() => {
        const update = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            if (!w || !h) return;
            setViewport({ w, h });
            setScale(Math.max(0.1, Math.min(w / CANVAS_W, h / CANVAS_H)));
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
    }, [hasResizeObserver]);

    // ── Stage mouse events ────────────────────────────────────────────────────
    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        if (!placementMode) return;
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;
        const cx = pos.x / scale;
        const cy = pos.y / scale;
        setGhostPos({
            x: snap(Math.max(5, Math.min(cx - newTableDraft.w / 2, CANVAS_W - newTableDraft.w - 5))),
            y: snap(Math.max(5, Math.min(cy - newTableDraft.h / 2, CANVAS_H - newTableDraft.h - 5))),
        });
    };

    const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
        if (!placementMode) {
            // Click on bare canvas → deselect
            if (e.target === e.target.getStage()) onTableSelect(null);
            return;
        }
        if (ghostPos) onPlaceTable(ghostPos.x, ghostPos.y);
    };

    const stageW = CANVAS_W * scale;
    const stageH = CANVAS_H * scale;
    const lowPowerMode = viewport.w <= 1024 || viewport.h <= 900 || !hasResizeObserver;

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#08080e', overflow: 'hidden',
                cursor: placementMode ? 'crosshair' : 'default',
            }}
        >
            <Stage
                width={stageW} height={stageH}
                scaleX={scale} scaleY={scale}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setGhostPos(null)}
                onMouseDown={onUserInteract}
                onTouchStart={onUserInteract}
                onClick={handleStageClick}
                style={{ display: 'block' }}
            >
                <Layer>

                    {/* ── Background ─────────────────────────────────────── */}
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: CANVAS_W, y: CANVAS_H }}
                        fillLinearGradientColorStops={[0, '#ede8df', 0.5, '#e4ddd2', 1, '#d8d0c4']}
                    />

                    {/* Subtle snap grid */}
                    {!lowPowerMode && Array.from({ length: Math.ceil(CANVAS_W / 50) }, (_, i) => (
                        <Rect key={`vg${i}`} x={(i + 1) * 50} y={0} width={1} height={CANVAS_H}
                            fill="rgba(0,0,0,0.05)" />
                    ))}
                    {!lowPowerMode && Array.from({ length: Math.ceil(CANVAS_H / 50) }, (_, i) => (
                        <Rect key={`hg${i}`} x={0} y={(i + 1) * 50} width={CANVAS_W} height={1}
                            fill="rgba(0,0,0,0.05)" />
                    ))}

                    {/* Marble veins */}
                    {!lowPowerMode && [120, 340, 580, 780].map((xv, i) => (
                        <Rect key={`mv${i}`} x={xv} y={0} width={1} height={CANVAS_H}
                            fill="rgba(180,170,150,0.15)" />
                    ))}

                    {/* ── Border: thick dark outer + inner gold line ──────── */}
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                        fill="transparent" stroke="#1A1208" strokeWidth={14} cornerRadius={6} />
                    <Rect x={16} y={16} width={CANVAS_W - 32} height={CANVAS_H - 32}
                        fill="transparent" stroke="#F6BC59" strokeWidth={2.5} cornerRadius={3} />
                    <Rect x={21} y={21} width={CANVAS_W - 42} height={CANVAS_H - 42}
                        fill="transparent" stroke="rgba(246,188,89,0.28)" strokeWidth={1} cornerRadius={2} />

                    {/* ── DJ Booth ────────────────────────────────────────── */}
                    <Rect x={0} y={0} width={CANVAS_W} height={112}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: 0, y: 112 }}
                        fillLinearGradientColorStops={[0, '#2A2418', 0.5, '#181410', 1, '#0E0C08']} />
                    <Rect x={0} y={108} width={CANVAS_W} height={4}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: CANVAS_W, y: 0 }}
                        fillLinearGradientColorStops={[0, 'transparent', 0.15, '#F6BC59', 0.85, '#F6BC59', 1, 'transparent']} />
                    <Text x={0} y={18} width={CANVAS_W} text="DJ"
                        fontSize={60} fontStyle="bold" fill="#F6BC59" align="center"
                        fontFamily="Georgia, serif" letterSpacing={25}
                        shadowColor="rgba(246,188,89,0.9)" shadowBlur={lowPowerMode ? 10 : 25} />

                    {/* ── Stage horizontal ────────────────────────────────── */}
                    <Rect x={150} y={260} width={780} height={100}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: 0, y: 100 }}
                        fillLinearGradientColorStops={[0, '#262018', 0.5, '#141008', 1, '#0A0806']}
                        stroke="#F6BC59" strokeWidth={3} cornerRadius={5} />
                    <Text x={150} y={288} width={780} text="STAGE"
                        fontSize={40} fontStyle="bold" fill="#F6BC59" align="center"
                        fontFamily="Georgia, serif" letterSpacing={14}
                        shadowColor="rgba(246,188,89,0.9)" shadowBlur={lowPowerMode ? 8 : 20} />

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
                        shadowColor="rgba(246,188,89,0.5)" shadowBlur={lowPowerMode ? 10 : 32} />
                    <Circle x={540} y={970} radius={56}
                        fill="transparent" stroke="rgba(246,188,89,0.30)" strokeWidth={2} />
                    <Text x={474} y={956} width={131} text="TIGER"
                        fontSize={24} fontStyle="bold" fill="#F6BC59" align="center"
                        fontFamily="Georgia, serif" letterSpacing={5}
                        shadowColor="rgba(246,188,89,1.0)" shadowBlur={22} />

                    {/* ── Red accent dividers ─────────────────────────────── */}
                    <Rect x={152} y={845} width={45} height={4} fill="#dc2626" cornerRadius={2}
                        shadowColor="#dc2626" shadowBlur={7} />
                    <Rect x={883} y={1560} width={45} height={7} fill="#dc2626" cornerRadius={2}
                        shadowColor="#dc2626" shadowBlur={7} />

                    {/* ── Tables (draggable) ──────────────────────────────── */}
                    {tables.map((table) => {
                        const { x, y, w, h } = table.coordinates;
                        const isSelected = selectedTableId === table.id;
                        const isSmall = w <= 80;
                        const stops = FREE_STOPS[table.zone_type] ?? FREE_STOPS.Orange;

                        return (
                            <Group
                                key={table.id}
                                x={x} y={y}
                                draggable
                                dragBoundFunc={(pos) => ({
                                    x: Math.max(5 * scale, Math.min(pos.x, (CANVAS_W - w - 5) * scale)),
                                    y: Math.max(5 * scale, Math.min(pos.y, (CANVAS_H - h - 5) * scale)),
                                })}
                                onDragEnd={(e) => {
                                    // e.target.x/y() are in canvas (unscaled) coords
                                    const nx = snap(Math.max(5, Math.min(e.target.x(), CANVAS_W - w - 5)));
                                    const ny = snap(Math.max(5, Math.min(e.target.y(), CANVAS_H - h - 5)));
                                    e.target.position({ x: nx, y: ny }); // snap visually
                                    onTableMove(table.id, nx, ny);
                                }}
                                onDragStart={onUserInteract}
                                onClick={(e) => {
                                    e.cancelBubble = true;
                                    if (!placementMode) onTableSelect(table);
                                }}
                                onTap={(e) => {
                                    e.cancelBubble = true;
                                    if (!placementMode) onTableSelect(table);
                                }}
                            >
                                {/* Selection ring */}
                                {isSelected && (
                                    <Rect
                                        x={-5} y={-5} width={w + 10} height={h + 10}
                                        fill="transparent"
                                        stroke="#f97316" strokeWidth={2}
                                        cornerRadius={isSmall ? 6 : 12}
                                        dash={[6, 3]}
                                    />
                                )}

                                {/* Drop shadow */}
                                <Rect x={2} y={3} width={w} height={h}
                                    fill="rgba(0,0,0,0.3)" cornerRadius={isSmall ? 4 : 9} />

                                {/* Body */}
                                <Rect
                                    width={w} height={h}
                                    fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                                    fillLinearGradientEndPoint={{ x: 0, y: h }}
                                    fillLinearGradientColorStops={stops}
                                    stroke={isSelected ? '#f97316' : 'rgba(200,168,75,0.6)'}
                                    strokeWidth={isSelected ? 1.5 : 0.8}
                                    cornerRadius={isSmall ? 4 : 9}
                                    shadowColor={isSelected ? 'rgba(249,115,22,0.6)' : 'transparent'}
                                    shadowBlur={lowPowerMode ? 0 : (isSelected ? 16 : 0)}
                                    perfectDrawEnabled={!lowPowerMode}
                                />

                                {/* Gloss strip */}
                                {!isSmall && !lowPowerMode && (
                                    <Rect x={3} y={2} width={w - 6} height={Math.min(h * 0.28, 14)}
                                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                                        fillLinearGradientEndPoint={{ x: 0, y: 14 }}
                                        fillLinearGradientColorStops={[0, 'rgba(255,255,255,0.2)', 1, 'rgba(255,255,255,0)']}
                                        cornerRadius={[7, 7, 0, 0]} />
                                )}

                                {/* Divider lines */}
                                {!isSmall && !lowPowerMode && Array.from({ length: Math.max(0, Math.floor(h / 18) - 1) }, (_, i) => (
                                    <Rect key={i}
                                        x={3} y={((i + 1) / (Math.floor(h / 18))) * h}
                                        width={w - 6} height={1}
                                        fill="rgba(0,0,0,0.2)" />
                                ))}

                                {/* Label */}
                                <Text
                                    width={w} height={h}
                                    text={table.table_number}
                                    fontSize={isSmall ? 14 : (w >= 180 ? 26 : 20)}
                                    fontStyle="bold"
                                    fill={table.zone_type === 'Purple' || table.zone_type === 'Teal' ? '#FFFFFF' : '#1A0A00'}
                                    align="center" verticalAlign="middle"
                                    fontFamily="'Montserrat', sans-serif"
                                    shadowColor="rgba(0,0,0,0.7)" shadowBlur={3} shadowOffsetY={1}
                                />

                                {/* Drag handle icon (non-small only) */}
                                {!isSmall && (
                                    <Text
                                        x={w - 14} y={2} width={12} height={12}
                                        text="⠿" fontSize={9} fill="rgba(255,255,255,0.3)"
                                        align="center"
                                    />
                                )}
                            </Group>
                        );
                    })}

                    {/* ── Ghost preview (placement mode) ─────────────────── */}
                    {placementMode && ghostPos && (
                        <Group x={ghostPos.x} y={ghostPos.y} opacity={0.8} listening={false}>
                            <Rect
                                width={newTableDraft.w} height={newTableDraft.h}
                                fill={GHOST_FILL[newTableDraft.zone_type] ?? '#c8a84b'}
                                stroke="#fbbf24" strokeWidth={2}
                                cornerRadius={newTableDraft.h <= 20 ? 3 : 8}
                                dash={[5, 3]}
                                shadowColor="#fbbf24" shadowBlur={lowPowerMode ? 4 : 14}
                            />
                            <Text
                                width={newTableDraft.w} height={newTableDraft.h}
                                text={newTableDraft.table_number || '?'}
                                fontSize={newTableDraft.h <= 20 ? 7 : 12}
                                fontStyle="bold" fill="#fff"
                                align="center" verticalAlign="middle"
                                fontFamily="Inter, sans-serif"
                            />
                        </Group>
                    )}

                </Layer>
            </Stage>
        </div>
    );
}
