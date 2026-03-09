'use client';
import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Circle, Group } from 'react-konva';
import { TableStatus, useAppStore } from '@/lib/store';

interface FloorMapProps {
    tables: TableStatus[];
    onTableClick: (table: TableStatus) => void;
}

// Zone color mappings mapping to the V2 seed.py names
const ZONE_COLORS: Record<string, { base: string, light: string, dark: string }> = {
    Purple: { base: '#9333ea', light: '#a855f7', dark: '#7e22ce' },
    Grey: { base: '#475569', light: '#64748b', dark: '#334155' },
    Orange: { base: '#ea580c', light: '#f97316', dark: '#c2410c' },
    Teal: { base: '#0d9488', light: '#14b8a6', dark: '#0f766e' },
    White: { base: '#e2e8f0', light: '#f8fafc', dark: '#cbd5e1' },
};

const STATUS_COLORS = {
    free: { fill: '#15803d', stroke: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
    reserved: { fill: '#991b1b', stroke: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
    occupied: { fill: '#854d0e', stroke: '#eab308', glow: 'rgba(234,179,8,0.4)' },
};

// Scale canvas to fit container
const CANVAS_W = 1000;
const CANVAS_H = 1050;

export default function FloorMap({ tables, onTableClick }: FloorMapProps) {
    const { linkMode, linkedTables, addLinkedTable, removeLinkedTable } = useAppStore();
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    useEffect(() => {
        const update = () => {
            if (containerRef.current) {
                const w = containerRef.current.clientWidth;
                setScale(Math.min(w / CANVAS_W, 1));
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const handleTableClick = (table: TableStatus) => {
        if (linkMode) {
            if (linkedTables.includes(table.id)) {
                removeLinkedTable(table.id);
            } else {
                addLinkedTable(table.id);
            }
            return;
        }
        onTableClick(table);
    };

    return (
        <div ref={containerRef} style={{ width: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Stage width={CANVAS_W * scale} height={CANVAS_H * scale} scaleX={scale} scaleY={scale}>
                <Layer>
                    {/* Background */}
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#e5e5e5" />

                    {/* DJ Zone */}
                    <Rect x={210} y={20} width={580} height={40} fill="#111" />
                    <Text x={210} y={25} width={580} text="DJ" fontSize={30} fontStyle="bold" fill="#fff" align="center" fontFamily="Inter, sans-serif" />

                    {/* Stage block */}
                    <Rect x={210} y={140} width={580} height={45} fill="#111" />
                    <Text x={210} y={147} width={580} text="STAGE" fontSize={30} fontStyle="bold" fill="#fff" align="center" fontFamily="Inter, sans-serif" />
                    <Rect x={440} y={185} width={120} height={225} fill="#111" />

                    {/* Piste circles */}
                    <Rect x={325} y={490} width={350} height={150} fill="#111" />
                    <Text x={355} y={500} width={130} text="PISTE" fontSize={22} fontStyle="bold" fill="#fff" align="center" rotation={90} fontFamily="Inter, sans-serif" />
                    <Text x={625} y={500} width={130} text="PISTE" fontSize={22} fontStyle="bold" fill="#fff" align="center" rotation={90} fontFamily="Inter, sans-serif" />
                    <Circle x={500} y={565} radius={60} stroke="#fff" strokeWidth={2} />
                    <Text x={440} y={550} width={120} text="TIGER" fontSize={24} fontStyle="bold" fill="#fff" align="center" fontFamily="Inter, sans-serif" />

                    {/* Red block dividers */}
                    <Rect x={155} y={410} width={40} height={10} fill="#dc2626" />
                    <Rect x={805} y={860} width={40} height={10} fill="#dc2626" />

                    {/* Render Tables */}
                    {tables.map((table) => {
                        const { x, y, w, h } = table.coordinates;
                        const isLinked = linkedTables.includes(table.id);
                        const isHovered = hoveredId === table.id;
                        const sc = STATUS_COLORS[table.status];
                        const zc = ZONE_COLORS[table.zone_type];

                        // In link mode, show zone colors for selection feedback
                        const fillColor = linkMode
                            ? (isLinked ? '#f97316' : zc.base)
                            : sc.fill;
                        const strokeColor = linkMode
                            ? (isLinked ? '#fbbf24' : zc.light)
                            : sc.stroke;

                        const isSmall = w <= 44;

                        return (
                            <Group key={table.id} x={x} y={y}
                                onMouseEnter={() => setHoveredId(table.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => handleTableClick(table)}
                                onTap={() => handleTableClick(table)}
                            >
                                {/* Glow effect on hover */}
                                {(isHovered || isLinked) && (
                                    <Rect
                                        x={-3} y={-3}
                                        width={w + 6} height={h + 6}
                                        fill="transparent"
                                        stroke={isLinked ? '#fbbf24' : sc.glow}
                                        strokeWidth={2}
                                        cornerRadius={isSmall ? 4 : 8}
                                        opacity={0.8}
                                    />
                                )}
                                {/* Table body */}
                                <Rect
                                    width={w} height={h}
                                    fill={fillColor}
                                    stroke={strokeColor}
                                    strokeWidth={isHovered || isLinked ? 2 : 1}
                                    cornerRadius={isSmall ? 4 : 8}
                                    shadowColor={isHovered ? sc.glow : 'transparent'}
                                    shadowBlur={isHovered ? 12 : 0}
                                    opacity={isHovered ? 1 : 0.9}
                                />
                                {/* Table number */}
                                <Text
                                    width={w} height={h}
                                    text={table.table_number}
                                    fontSize={isSmall ? 8 : 11}
                                    fontStyle="bold"
                                    fill="#ffffff"
                                    align="center"
                                    verticalAlign="middle"
                                    fontFamily="Inter, sans-serif"
                                    opacity={0.95}
                                />

                            </Group>
                        );
                    })}
                </Layer>
            </Stage>
        </div>
    );
}
