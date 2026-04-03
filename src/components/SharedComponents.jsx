import React from 'react';
import { Package, TrendingUp } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

export const COLORS = {
    obsidian: '#0a0a0a',
    obsidianLight: '#141414',
    gold: '#d4af37',
    goldHover: '#b5952f',
    acid: '#00ff88',
    danger: '#ff3e3e',
    grey: '#4a4a4a',
    white: '#ffffff'
};

export const PIE_COLORS = [COLORS.gold, COLORS.acid, COLORS.danger, COLORS.white, COLORS.grey, COLORS.goldHover];

export const formatPesos = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '$ 0';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num);
};

export function KpiCard({ title, amount, subtitle, icon, color }) {
    const isPositive = color?.includes('teal') || color?.includes('green');
    const isDanger = color?.includes('red') || color?.includes('pink') || color?.includes('yellow') || color?.includes('amber');
    const accentColor = isDanger ? 'var(--color-signal)' : isPositive ? 'var(--color-acid)' : 'var(--color-gold)';

    return (
        <div className="glass-panel p-5 lg:p-6 flex flex-col items-center justify-center text-center card-hover-fx min-h-[160px] h-full relative overflow-hidden group">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-500 group-hover:scale-110 pointer-events-none">
                {React.cloneElement(icon || <Package />, { size: 140, color: '#ffffff' })}
            </div>
            <div className="p-3 bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white shadow-xl rounded-full mb-3 z-10 transition-transform group-hover:-translate-y-1 group-hover:scale-110 duration-300 shrink-0">
                {React.cloneElement(icon || <Package />, { size: 24, color: accentColor })}
            </div>
            <div className="w-full z-10 flex flex-col items-center justify-center flex-1 h-full">
                <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.15em] text-gray-400 font-bold mb-1 px-1 text-center w-full text-balance break-words">{title}</p>
                <h4 className="text-xl sm:text-2xl lg:text-[1.60rem] font-black tracking-tight text-white w-full flex-grow flex items-center justify-center my-2 leading-none text-balance break-words px-2">
                    {amount}
                </h4>
                {subtitle && (
                    <div className="mt-1 shrink-0 w-full flex justify-center px-2">
                        <span className="text-[9px] font-bold px-3 py-1 uppercase tracking-widest border border-white/10 rounded-full inline-block truncate max-w-full" style={{ color: accentColor, background: 'rgba(0,0,0,0.5)' }}>
                            {subtitle}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ChartBox({ title, data, type, color = COLORS.gold, xKey }) {
    const chartColor = color === '#pink' ? COLORS.grey : color;

    return (
        <div className="glass-panel p-6 shadow-xl relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-gold)] opacity-[0.02] blur-3xl rounded-full" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-[var(--color-gold)]" /> {title}
            </h3>
            <div className="h-64 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'bar' ? (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-obsidian-border)" />
                            <XAxis dataKey={xKey || 'name'} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#a0a0a0' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a0a0a0', fontWeight: '700' }} tickFormatter={(v) => `$${v / 1000}k`} />
                            <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', borderRadius: '0px', color: '#fff' }} itemStyle={{ color: 'var(--color-gold)', fontWeight: 'bold' }} />
                            <Bar dataKey="value" fill={chartColor} radius={[0, 0, 0, 0]} barSize={25} />
                        </BarChart>
                    ) : type === 'pie' ? (
                        <PieChart>
                            <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                {(data || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', borderRadius: '0px', color: '#fff' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#a0a0a0' }} />
                        </PieChart>
                    ) : type === 'area' ? (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="cT" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-obsidian-border)" />
                            <XAxis dataKey={xKey || 'mes'} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#a0a0a0' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a0a0a0', fontWeight: '700' }} tickFormatter={(v) => `$${v / 1000}k`} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', borderRadius: '0px', color: '#fff' }} />
                            <Area type="monotone" dataKey="value" stroke={COLORS.gold} fillOpacity={1} fill="url(#cT)" strokeWidth={3} />
                        </AreaChart>
                    ) : (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-obsidian-border)" />
                            <XAxis dataKey={xKey || 'name'} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#a0a0a0' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a0a0a0', fontWeight: '700' }} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', borderRadius: '0px', color: '#fff' }} />
                            <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={3} dot={{ r: 3, fill: 'var(--color-obsidian)', strokeWidth: 2 }} />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function TableWrapper({ title, subtitle, children, action }) {
    return (
        <div className="glass-panel overflow-hidden shadow-xl w-full">
            <div className="p-4 lg:p-6 border-b border-[var(--color-obsidian-border)] bg-[var(--color-obsidian)] flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                    <h3 className="font-black text-white uppercase tracking-widest text-base lg:text-lg">{title}</h3>
                    {subtitle && <p className="text-[9px] lg:text-[10px] font-bold text-[var(--color-gold)] uppercase tracking-widest mt-1 opacity-80">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="overflow-x-auto w-full max-w-full">
                {children}
            </div>
        </div>
    );
}
