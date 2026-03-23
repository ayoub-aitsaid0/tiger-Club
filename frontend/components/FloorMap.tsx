'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Circle, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { TableStatus, useAppStore } from '@/lib/store';

interface FloorMapProps {
    tables: TableStatus[];
    onTableClick: (table: TableStatus) => void;
}

const CANVAS_W = 1080; // portrait-proportioned canvas (was 600); ratio 1080:1920 = 0.5625 matches reference
const CANVAS_H = 1920;
const MIN_SCALE = 0.15;
const MAX_SCALE = 3.0;

// ─── Gradient stops ────────────────────────────────────────────────────────
// Palette: #F6BC59 (golden) as dominant colour; #F37950 only as deep shadow.
// Style: polished brass/gold plate — light cream highlight → rich amber → dark base.
// Matches the reference image (bgtiger.png): cream background + warm gold tables.
const FREE_STOPS: Record<string, (number | string)[]> = {
    Orange: [0, '#FFF2C8', 0.14, '#F6BC59', 0.48, '#D4920C', 0.82, '#A86510', 1, '#7A4808'],
    Teal:   [0, '#A8E8D0', 0.14, '#28B880', 0.48, '#0E8858', 0.82, '#085838', 1, '#043820'],
    Grey:   [0, '#D4D0C0', 0.14, '#9C9488', 0.48, '#6C6460', 0.82, '#484038', 1, '#282420'],
    Purple: [0, '#E0B0FF', 0.14, '#9040E8', 0.48, '#6018B0', 0.82, '#401888', 1, '#200560'],
    White:  [0, '#FFF8DC', 0.14, '#F0B840', 0.48, '#C88020', 0.82, '#9A6018', 1, '#6A4010'],
};
const RESERVED_STOPS: (number | string)[] = [0, '#FFA8A8', 0.14, '#E02828', 0.48, '#A80808', 0.82, '#780000', 1, '#500000'];
const OCCUPIED_STOPS:  (number | string)[] = [0, '#FFE898', 0.14, '#E09808', 0.48, '#A87005', 0.82, '#785003', 1, '#503000'];
const LINKED_STOPS:    (number | string)[] = [0, '#FFF2C8', 0.14, '#F6BC59', 0.48, '#D4920C', 0.82, '#A86510', 1, '#7A4808'];

function getStops(status: string, zone: string, linked: boolean): (number | string)[] {
    if (linked) return LINKED_STOPS;
    if (status === 'reserved') return RESERVED_STOPS;
    if (status === 'occupied') return OCCUPIED_STOPS;
    return FREE_STOPS[zone] ?? FREE_STOPS.Orange;
}

function getStroke(status: string, zone: string, linked: boolean, hovered: boolean): string {
    if (linked)  return '#F6BC59';
    if (hovered) return 'rgba(255,255,255,0.85)';
    if (status === 'reserved') return '#ff6060';
    if (status === 'occupied') return '#F6BC59';
    const map: Record<string, string> = {
        Orange: '#F6BC59', Teal: '#50D0A8',
        Grey: '#b0a898', Purple: '#c080ff', White: '#F6BC59',
    };
    return map[zone] ?? '#F6BC59';
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

    // ── Fit the whole map into the container ─────────────────────────────
    // Reserve space for the floating top bar, then contain the full canvas
    // (Math.min) so every table is visible. Side bars on landscape screens are
    // unavoidable for a portrait canvas but no content is ever clipped.
    const BAR_H = 58; // height of the floating top control bar

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

    const fitAll = fitMap; // ⊙ reset does the same thing

    // ── ResizeObserver ───────────────────────────────────────────────────
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

    // ── Clamp position so the canvas never goes fully off-screen ────────
    const clampPos = (x: number, y: number, scale: number, vw: number, vh: number) => {
        const margin = 60;
        const cw = CANVAS_W * scale;
        const ch = CANVAS_H * scale;
        return {
            x: Math.min(vw - margin, Math.max(margin - cw, x)),
            y: Math.min(vh - margin, Math.max(BAR_H - ch + margin, y)),
        };
    };

    // ── Zoom helper (zoom toward a point) ────────────────────────────────
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

    // ── Mouse wheel zoom ─────────────────────────────────────────────────
    const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = e.target.getStage()!;
        const ptr   = stage.getPointerPosition()!;
        const factor = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12;
        zoomTo(stageScale * factor, ptr.x, ptr.y);
    };

    // ── Touch pinch-to-zoom ──────────────────────────────────────────────
    const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
        const touches = e.evt.touches;
        if (touches.length !== 2) { lastDist.current = 0; lastCenter.current = null; return; }
        e.evt.preventDefault();

        const t0 = touches[0];
        const t1 = touches[1];
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cx = (t0.clientX + t1.clientX) / 2;
        const cy = (t0.clientY + t1.clientY) / 2;

        if (lastDist.current > 0) {
            const factor = dist / lastDist.current;
            zoomTo(stageScale * factor, cx, cy);
        }
        lastDist.current = dist;
        lastCenter.current = { x: cx, y: cy };
    };

    const handleTouchEnd = () => { lastDist.current = 0; lastCenter.current = null; };

    // ── Stage drag (pan) ─────────────────────────────────────────────────
    const handleDragStart = () => { isDragging.current = true; };
    const handleDragEnd   = (e: KonvaEventObject<DragEvent>) => {
        isDragging.current = false;
        const clamped = clampPos(e.target.x(), e.target.y(), stageScale, viewport.w, viewport.h);
        e.target.position(clamped);
        setStagePos(clamped);
    };

    // ── Table click ──────────────────────────────────────────────────────
    const handleClick = (table: TableStatus) => {
        if (isDragging.current) return; // ignore click after drag
        if (linkMode) {
            linkedTables.includes(table.id) ? removeLinkedTable(table.id) : addLinkedTable(table.id);
            return;
        }
        onTableClick(table);
    };

    // ── Zoom buttons — pivot on canvas center (clamped to viewport) ──────
    const canvasCx = () => Math.min(Math.max(stagePos.x + (CANVAS_W * stageScale) / 2, 0), viewport.w);
    const canvasCy = () => Math.min(Math.max(stagePos.y + (CANVAS_H * stageScale) / 2, 0), viewport.h);
    const zoomIn   = () => zoomTo(stageScale * 1.25, canvasCx(), canvasCy());
    const zoomOut  = () => zoomTo(stageScale / 1.25, canvasCx(), canvasCy());
    const resetZoom = () => fitAll(viewport.w, viewport.h); // ⊙ shows all tables

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#0A0806', position: 'relative', overflow: 'hidden' }}>

            {/* Konva Stage — fills full container, canvas pans/zooms inside */}
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

                    {/* ══ BACKGROUND — Dark luxury marble ══════════════════════ */}

                    {/* 1 · Base: deep warm charcoal gradient (top-centre → bottom) */}
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                        fillLinearGradientStartPoint={{ x: CANVAS_W * 0.5, y: 0 }}
                        fillLinearGradientEndPoint={{ x: CANVAS_W * 0.5, y: CANVAS_H }}
                        fillLinearGradientColorStops={[
                            0,    '#201A12',
                            0.25, '#161008',
                            0.55, '#0E0C06',
                            0.80, '#131008',
                            1,    '#1C1610',
                        ]}
                    />

                    {/* 2 · Diagonal warmth band (left-warm → centre-neutral → right-warm) */}
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                        fillLinearGradientStartPoint={{ x: 0, y: CANVAS_H * 0.35 }}
                        fillLinearGradientEndPoint={{ x: CANVAS_W, y: CANVAS_H * 0.65 }}
                        fillLinearGradientColorStops={[
                            0,   'rgba(200,150,55,0.10)',
                            0.4, 'rgba(0,0,0,0)',
                            0.6, 'rgba(0,0,0,0)',
                            1,   'rgba(180,130,45,0.09)',
                        ]}
                    />

                    {/* 3 · Tiger-circle golden glow — heart of the club */}
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                        fillRadialGradientStartPoint={{ x: 551, y: 1029 }}
                        fillRadialGradientEndPoint={{ x: 551, y: 1029 }}
                        fillRadialGradientStartRadius={0}
                        fillRadialGradientEndRadius={720}
                        fillRadialGradientColorStops={[
                            0,    'rgba(246,188,89,0.34)',
                            0.28, 'rgba(220,155,55,0.15)',
                            0.60, 'rgba(180,115,35,0.05)',
                            1,    'rgba(0,0,0,0)',
                        ]}
                    />

                    {/* 4 · DJ / Stage spotlight from top */}
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                        fillRadialGradientStartPoint={{ x: CANVAS_W / 2, y: 56 }}
                        fillRadialGradientEndPoint={{ x: CANVAS_W / 2, y: 56 }}
                        fillRadialGradientStartRadius={0}
                        fillRadialGradientEndRadius={600}
                        fillRadialGradientColorStops={[
                            0,    'rgba(246,188,89,0.20)',
                            0.40, 'rgba(200,140,50,0.08)',
                            1,    'rgba(0,0,0,0)',
                        ]}
                    />

                    {/* 5 · Vignette — darken all four edges, focus on centre */}
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                        fillRadialGradientStartPoint={{ x: CANVAS_W / 2, y: CANVAS_H * 0.40 }}
                        fillRadialGradientEndPoint={{ x: CANVAS_W / 2, y: CANVAS_H * 0.40 }}
                        fillRadialGradientStartRadius={300}
                        fillRadialGradientEndRadius={1100}
                        fillRadialGradientColorStops={[
                            0,    'rgba(0,0,0,0)',
                            0.42, 'rgba(0,0,0,0.18)',
                            1,    'rgba(0,0,0,0.76)',
                        ]}
                    />

                    {/* 6 · Marble veins — horizontal hairlines */}
                    {([
                        [0,   252,  CANVAS_W, 1.5, 0.07],
                        [0,   430,  640,      1,   0.06],
                        [560, 448,  520,      1,   0.04],
                        [0,   718,  CANVAS_W, 2,   0.05],
                        [120, 872,  450,      1,   0.06],
                        [0,   1088, 320,      1.5, 0.07],
                        [710, 1148, 370,      1,   0.05],
                        [0,   1298, CANVAS_W, 1,   0.04],
                        [250, 1462, 580,      2,   0.06],
                        [0,   1638, 470,      1,   0.05],
                        [610, 1714, 470,      1.5, 0.07],
                        [0,   1858, 720,      1,   0.04],
                    ] as [number,number,number,number,number][]).map(([x,y,w,h,a], i) => (
                        <Rect key={`hv${i}`} x={x} y={y} width={w} height={h}
                              fill={`rgba(255,238,192,${a})`} />
                    ))}

                    {/* 7 · Marble veins — vertical hairlines */}
                    {([
                        [272, 0,    720, 0.05],
                        [812, 380,  870, 0.04],
                        [178, 1225, 695, 0.06],
                        [930, 130,  470, 0.04],
                    ] as [number,number,number,number][]).map(([x,y,h,a], i) => (
                        <Rect key={`vv${i}`} x={x} y={y} width={1.5} height={h}
                              fill={`rgba(255,238,192,${a})`} />
                    ))}

                    {/* ── Border: thick dark outer frame + inner gold line ─────── */}
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
                        fill="transparent" stroke="#1A1208" strokeWidth={14} cornerRadius={6} />
                    <Rect x={16} y={16} width={CANVAS_W - 32} height={CANVAS_H - 32}
                        fill="transparent" stroke="#F6BC59" strokeWidth={2.5} cornerRadius={3} />
                    <Rect x={21} y={21} width={CANVAS_W - 42} height={CANVAS_H - 42}
                        fill="transparent" stroke="rgba(246,188,89,0.28)" strokeWidth={1} cornerRadius={2} />

                    {/* ── DJ Booth ─────────────────────────────────────────── */}
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
                        shadowColor="rgba(246,188,89,0.9)" shadowBlur={25} />

                    {/* ── Stage horizontal ─────────────────────────────────── */}
                    {/* Spans from right of table 36 (C1+W=153) to left of table 40B (C9=986) */}
                    <Rect x={154} y={254} width={832} height={91}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: 0, y: 91 }}
                        fillLinearGradientColorStops={[0, '#262018', 0.5, '#141008', 1, '#0A0806']}
                        stroke="#F6BC59" strokeWidth={3} cornerRadius={5} />
                    <Text x={154} y={278} width={832} text="STAGE"
                        fontSize={40} fontStyle="bold" fill="#F6BC59" align="center"
                        fontFamily="Georgia, serif" letterSpacing={14}
                        shadowColor="rgba(246,188,89,0.9)" shadowBlur={20} />

                    {/* ── Stage vertical ───────────────────────────────────── */}
                    {/* x=468 (C4+W) to x=634 (C6); ends at y=770 leaving gap for tables 12 & 12.B */}
                    <Rect x={468} y={345} width={166} height={425}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: 166, y: 0 }}
                        fillLinearGradientColorStops={[0, '#262018', 0.5, '#141008', 1, '#262018']}
                        stroke="#F6BC59" strokeWidth={3} />
                    <Text x={566} y={492} width={131} text="STAGE"
                        fontSize={25} fontStyle="bold" fill="#F6BC59" align="center"
                        rotation={90} fontFamily="Georgia, serif" letterSpacing={7}
                        shadowColor="rgba(246,188,89,0.9)" shadowBlur={14} />

                    {/* ── Piste ────────────────────────────────────────────── */}
                    {/* Spans from C3 right edge (342) to C7 left edge (760), width=418 */}
                    <Rect x={342} y={888} width={418} height={281}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: 0, y: 281 }}
                        fillLinearGradientColorStops={[0, '#262018', 0.5, '#141008', 1, '#0A0806']}
                        stroke="#F6BC59" strokeWidth={3} />
                    <Rect x={344} y={890} width={414} height={2} fill="rgba(246,188,89,0.40)" />
                    <Rect x={344} y={1167} width={414} height={2} fill="rgba(246,188,89,0.40)" />
                    <Text x={424} y={954} width={149} text="PISTE"
                        fontSize={25} fontStyle="bold" fill="#F6BC59"
                        align="center" rotation={90} fontFamily="Georgia, serif" letterSpacing={5}
                        shadowColor="rgba(246,188,89,0.9)" shadowBlur={14} />
                    <Text x={705} y={954} width={149} text="PISTE"
                        fontSize={25} fontStyle="bold" fill="#F6BC59"
                        align="center" rotation={90} fontFamily="Georgia, serif" letterSpacing={5}
                        shadowColor="rgba(246,188,89,0.9)" shadowBlur={14} />
                    <Circle x={551} y={1029} radius={72}
                        fillLinearGradientStartPoint={{ x: -72, y: -72 }}
                        fillLinearGradientEndPoint={{ x: 72, y: 72 }}
                        fillLinearGradientColorStops={[0, '#302818', 0.5, '#1E1810', 1, '#0E0C08']}
                        stroke="#F6BC59" strokeWidth={4}
                        shadowColor="rgba(246,188,89,0.5)" shadowBlur={32} />
                    <Circle x={551} y={1029} radius={63}
                        fill="transparent" stroke="rgba(246,188,89,0.30)" strokeWidth={2} />
                    <Text x={484} y={1002} width={131} text="TIGER"
                        fontSize={27} fontStyle="bold" fill="#F6BC59" align="center"
                        fontFamily="Georgia, serif" letterSpacing={5}
                        shadowColor="rgba(246,188,89,1.0)" shadowBlur={22} />

                    {/* ── Red accent dividers ───────────────────────────────── */}
                    <Rect x={171} y={756} width={45} height={3} fill="#dc2626" cornerRadius={2}
                        shadowColor="#dc2626" shadowBlur={7} />
                    <Rect x={887} y={1553} width={45} height={7} fill="#dc2626" cornerRadius={2}
                        shadowColor="#dc2626" shadowBlur={7} />

                    {/* ── Tables ───────────────────────────────────────────── */}
                    {tables.map((table) => {
                        const { x, y, w, h } = table.coordinates;
                        const isLinked  = linkedTables.includes(table.id);
                        const isHovered = hoveredId === table.id;
                        const isSmall   = w <= 80;
                        const stops       = getStops(table.status, table.zone_type, isLinked);
                        const strokeColor = getStroke(table.status, table.zone_type, isLinked, isHovered);
                        const strokeW     = isLinked || isHovered ? 2 : 1.2;
                        const radius      = isSmall ? 9 : 18;
                        const fontSize    = isSmall ? 15 : (w >= 180 ? 28 : 22);
                        // Dark text on gold/cream tables (like reference), light on dark zones
                        const darkBg = table.zone_type === 'Purple' || table.zone_type === 'Teal'
                                    || table.status === 'reserved' || table.status === 'occupied';
                        const textFill    = darkBg ? '#FFFFFF' : '#1A0A00';

                        return (
                            <Group
                                key={table.id}
                                x={x} y={y}
                                onMouseEnter={() => setHoveredId(table.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => handleClick(table)}
                                onTap={() => handleClick(table)}
                            >
                                {/* Glow ring on hover / link-select */}
                                {(isHovered || isLinked) && (
                                    <Rect x={-8} y={-8} width={w + 16} height={h + 16}
                                        fill="transparent"
                                        stroke={isLinked ? '#F6BC59' : 'rgba(255,255,255,0.6)'}
                                        strokeWidth={isLinked ? 2.5 : 2}
                                        cornerRadius={radius + 4} opacity={0.95} />
                                )}
                                {/* Drop shadow tile */}
                                <Rect x={3} y={5} width={w} height={h}
                                    fill="rgba(0,0,0,0.22)" cornerRadius={radius} opacity={0.8} />
                                {/* Main table face */}
                                <Rect width={w} height={h}
                                    fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                                    fillLinearGradientEndPoint={{ x: 0, y: h }}
                                    fillLinearGradientColorStops={stops}
                                    stroke={strokeColor} strokeWidth={strokeW}
                                    cornerRadius={radius}
                                    shadowColor={isLinked ? 'rgba(246,188,89,0.8)' : isHovered ? 'rgba(255,255,255,0.5)' : 'transparent'}
                                    shadowBlur={isLinked || isHovered ? 14 : 0} />
                                {/* Metallic gloss strip at top */}
                                {!isSmall && (
                                    <Rect x={2} y={2} width={w - 4} height={Math.min(h * 0.32, 32)}
                                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                                        fillLinearGradientEndPoint={{ x: 0, y: Math.min(h * 0.32, 32) }}
                                        fillLinearGradientColorStops={[0, 'rgba(255,255,255,0.38)', 0.6, 'rgba(255,255,255,0.10)', 1, 'rgba(255,255,255,0)']}
                                        cornerRadius={[radius - 1, radius - 1, 0, 0]} />
                                )}
                                {/* Table number — Montserrat Black, white with drop shadow */}
                                <Text width={w} height={h} text={table.table_number}
                                    fontSize={fontSize}
                                    fontStyle="bold"
                                    fill={textFill}
                                    align="center" verticalAlign="middle"
                                    fontFamily="'Montserrat', sans-serif"
                                    shadowColor={darkBg ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.50)'}
                                    shadowBlur={darkBg ? 3 : 2}
                                    shadowOffsetX={0}
                                    shadowOffsetY={darkBg ? 1 : 0} />
                            </Group>
                        );
                    })}

                </Layer>
            </Stage>

            {/* ── Zoom controls (bottom-right) ─────────────────────────── */}
            <div style={{
                position: 'absolute', bottom: 16, right: 16,
                display: 'flex', flexDirection: 'column', gap: 4,
                zIndex: 10,
            }}>
                {[
                    { label: '+', action: zoomIn },
                    { label: '⊙', action: resetZoom, title: 'Réinitialiser' },
                    { label: '−', action: zoomOut },
                ].map(({ label, action, title }) => (
                    <button key={label} onClick={action} title={title}
                        style={{
                            width: 34, height: 34,
                            background: 'rgba(8,8,14,0.85)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(200,168,75,0.28)',
                            borderRadius: 8,
                            color: '#F6BC59', fontSize: label === '⊙' ? '1rem' : '1.2rem',
                            fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                        }}
                    >
                        {label}
                    </button>
                ))}
                {/* Scale indicator */}
                <div style={{
                    textAlign: 'center', fontSize: '0.6rem', color: '#4a4a5a',
                    marginTop: 2, userSelect: 'none',
                }}>
                    {Math.round(stageScale * 100)}%
                </div>
            </div>
        </div>
    );
}
