import { TrendingUp, ShoppingCart, Users, AlertCircle, FileText, Package, AlertTriangle, DollarSign, TrendingDown, Percent } from 'lucide-react';
import { KpiCard, ChartBox, formatPesos } from './SharedComponents';

// ── Helpers ──────────────────────────────────────────────────────────────────
const diasHasta = (fechaStr) => {
    if (!fechaStr) return null;
    const parts = fechaStr.includes('/') ? fechaStr.split('/') : null;
    const iso = parts ? `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}` : fechaStr;
    const diff = Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
};

const BadgeEstado = ({ estado }) => {
    const cfg = {
        Vencida: 'border-[var(--color-signal)] text-[var(--color-signal)]',
        Pendiente: 'border-[var(--color-gold)] text-[var(--color-gold)]',
        Pagada: 'border-[var(--color-acid)] text-[var(--color-acid)]',
    };
    return (
        <span className={`px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider ${cfg[estado] || 'border-gray-600 text-gray-400'}`}>
            {estado}
        </span>
    );
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function ResumenDashboard({ data }) {
    const kpis = data.resumen?.kpis || [];
    const tendencia = data.resumen?.tendencia || [];

    // Datos cruzados entre módulos
    const facturasLista = data.facturas?.lista || [];
    const comprasFacturas = data.compras?.facturas || [];
    const inventario = data.stock?.inventario || [];
    const ventas = data.ventas?.acumuladas || 0;
    const comprasTotales = data.compras?.kpis?.totales || 0;
    const rrhh = data.rrhh?.kpis?.sueldosAPagar || 0;
    const pagosTotal = data.pagos?.kpis?.total || 0;
    const stockCritico = inventario.filter(i => i.stockFinal <= 0).length;
    const valesPendientes = data.rrhh?.kpis?.totalVales || 0;

    // ── KPIs display ─────────────────────────────────────────────────────────
    const kpisDisplay = kpis.length > 0 ? kpis : [
        { titulo: 'Ventas Totales', valor: ventas, tipo: 'positivo' },
        { titulo: 'Compras Totales', valor: comprasTotales, tipo: 'neutro' },
        { titulo: 'Costo RRHH', valor: rrhh, tipo: 'neutro' },
        { titulo: 'Deuda Proveedores', valor: data.compras?.kpis?.porPagar || 0, tipo: 'negativo' },
        { titulo: 'Resultado Neto', valor: ventas - pagosTotal, tipo: ventas - pagosTotal >= 0 ? 'positivo' : 'negativo' },
        { titulo: 'Egresos Totales', valor: pagosTotal, tipo: 'negativo' },
    ];

    const iconMap = {
        'Ventas Totales': <TrendingUp />, 'Compras Totales': <ShoppingCart />,
        'Costo RRHH': <Users />, 'Deuda Proveedores': <AlertCircle />,
        'Resultado Neto': <DollarSign />, 'Egresos Totales': <TrendingDown />,
    };
    const colorMap = { positivo: 'border-teal-700', negativo: 'border-red-700', neutro: 'border-blue-700' };

    // ── Facturas por vencer (próximas 30 días + vencidas) ────────────────────
    const facturasPorVencer = [...facturasLista, ...comprasFacturas]
        .filter(f => f.estado !== 'Pagada')
        .map(f => ({ ...f, diasRestantes: diasHasta(f.vencimiento) }))
        .filter(f => f.diasRestantes !== null && f.diasRestantes <= 30)
        .sort((a, b) => a.diasRestantes - b.diasRestantes)
        .slice(0, 8);

    // ── Categorías de gasto ──────────────────────────────────────────────────
    const categoriasRaw = data.compras?.porCategoria || [];
    // Construir desde facturas si porCategoria no viene de n8n
    const categoriasData = categoriasRaw.length > 0
        ? categoriasRaw
        : (() => {
            const map = {};
            [...comprasFacturas].forEach(f => {
                if (!f.categoria) return;
                map[f.categoria] = (map[f.categoria] || 0) + (f.total || 0);
            });
            return Object.entries(map).map(([name, value]) => ({ name, value }));
        })();
    const totalCategorias = categoriasData.reduce((s, c) => s + (c.value || c.monto || 0), 0);
    const categoriasMapeadas = categoriasData
        .map(c => ({ nombre: c.name || c.categoria, monto: c.value || c.monto || 0 }))
        .sort((a, b) => b.monto - a.monto);
    const categoriaMayor = categoriasMapeadas[0];

    // ── Top 10 productos más caros (por costo de uso) ────────────────────────
    const top10Productos = [...inventario]
        .map(item => {
            const uso = Math.max(0, (item.stockInicial || 0) + (item.compras || 0) - (item.stockFinal || 0));
            const costoUso = uso * (item.precioUnitario || 0);
            return { producto: item.producto, categoria: item.categoria, precioUnitario: item.precioUnitario || 0, uso, costoUso };
        })
        .sort((a, b) => b.costoUso - a.costoUso)
        .slice(0, 10);

    // Alertas cruzadas
    const facturasVencidas = facturasLista.filter(f => f.estado === 'Vencida').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── KPIs ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {kpisDisplay.map((kpi, i) => (
                    <KpiCard
                        key={i}
                        title={kpi.titulo}
                        amount={formatPesos(kpi.valor)}
                        subtitle={kpi.variacion != null ? `${kpi.variacion > 0 ? '+' : ''}${kpi.variacion}% vs mes ant.` : undefined}
                        color={colorMap[kpi.tipo] || 'border-blue-700'}
                        icon={iconMap[kpi.titulo] || <Package />}
                    />
                ))}
            </div>

            {/* ── Alertas ──────────────────────────────────────────────────── */}
            {(facturasVencidas > 0 || stockCritico > 0 || valesPendientes > 0) && (
                <div className="glass-panel p-4 border-l-4 border-[var(--color-signal)] flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-2 text-[var(--color-signal)] font-black text-[10px] uppercase tracking-widest shrink-0">
                        <AlertTriangle size={15} /> Alertas
                    </span>
                    {facturasVencidas > 0 && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-[var(--color-signal)]/10 border border-[var(--color-signal)]/30 px-3 py-1.5">
                            <FileText size={13} className="text-[var(--color-signal)]" />
                            {facturasVencidas} factura{facturasVencidas > 1 ? 's' : ''} vencida{facturasVencidas > 1 ? 's' : ''}
                        </span>
                    )}
                    {stockCritico > 0 && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-[var(--color-signal)]/10 border border-[var(--color-signal)]/30 px-3 py-1.5">
                            <Package size={13} className="text-[var(--color-signal)]" />
                            {stockCritico} producto{stockCritico > 1 ? 's' : ''} sin stock
                        </span>
                    )}
                    {valesPendientes > 0 && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 px-3 py-1.5">
                            <Users size={13} className="text-[var(--color-gold)]" />
                            Vales: {formatPesos(valesPendientes)}
                        </span>
                    )}
                </div>
            )}

            {/* ── Layout principal ──────────────────────────────────────────── */}
            <div className="space-y-6">

                    {/* Tendencia */}
                    {tendencia.length > 0 && (
                        <ChartBox title="Evolución de Ingresos" data={tendencia} type="area" xKey="mes" />
                    )}

                    {/* Facturas por vencer */}
                    <div className="glass-panel overflow-hidden border border-[var(--color-obsidian-border)]">
                        <div className="px-5 py-4 border-b border-[var(--color-obsidian-border)] flex items-center justify-between">
                            <h3 className="font-black text-[var(--color-gold)] uppercase tracking-widest text-sm flex items-center gap-2">
                                <FileText size={16} /> Facturas por Vencer
                            </h3>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Próximos 30 días</span>
                        </div>
                        {facturasPorVencer.length === 0 ? (
                            <p className="px-5 py-6 text-center text-gray-600 text-xs font-bold uppercase tracking-widest">Sin facturas próximas a vencer</p>
                        ) : (
                            <table className="w-full text-sm text-left text-white">
                                <thead className="bg-[#111] text-[10px] text-gray-500 uppercase tracking-widest font-black border-b border-[var(--color-obsidian-border)]">
                                    <tr>
                                        <th className="px-5 py-3">Concepto / Proveedor</th>
                                        <th className="px-4 py-3 text-center">Vencimiento</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                        <th className="px-4 py-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-obsidian-border)]">
                                    {facturasPorVencer.map((f, i) => (
                                        <tr key={i} className={`hover:bg-white/5 transition-colors ${f.diasRestantes < 0 ? 'bg-[var(--color-signal)]/5' : f.diasRestantes <= 7 ? 'bg-[var(--color-gold)]/5' : ''}`}>
                                            <td className="px-5 py-3">
                                                <p className="font-black text-white text-xs">{f.proveedor || f.concepto || '—'}</p>
                                                {f.id && <p className="text-[10px] font-mono text-gray-500">{f.id}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <p className="font-bold text-xs text-gray-300">{f.vencimiento}</p>
                                                <p className={`text-[10px] font-black ${f.diasRestantes < 0 ? 'text-[var(--color-signal)]' : f.diasRestantes <= 7 ? 'text-[var(--color-gold)]' : 'text-gray-500'}`}>
                                                    {f.diasRestantes < 0 ? `Vencida hace ${Math.abs(f.diasRestantes)}d` : f.diasRestantes === 0 ? 'Vence hoy' : `En ${f.diasRestantes}d`}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <BadgeEstado estado={f.estado} />
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-white">{formatPesos(f.total || f.monto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Categorías de gasto */}
                    <div className="glass-panel overflow-hidden border border-[var(--color-obsidian-border)]">
                        <div className="px-5 py-4 border-b border-[var(--color-obsidian-border)] flex items-center justify-between">
                            <h3 className="font-black text-[var(--color-gold)] uppercase tracking-widest text-sm flex items-center gap-2">
                                <ShoppingCart size={16} /> Gasto por Categoría
                            </h3>
                            {categoriaMayor && (
                                <span className="text-[10px] font-black text-[var(--color-signal)] uppercase tracking-widest flex items-center gap-1">
                                    <AlertTriangle size={11} /> Mayor: {categoriaMayor.nombre}
                                </span>
                            )}
                        </div>
                        {categoriasMapeadas.length === 0 ? (
                            <p className="px-5 py-6 text-center text-gray-600 text-xs font-bold uppercase tracking-widest">Sin datos de categorías</p>
                        ) : (
                            <div className="p-5 space-y-3">
                                {categoriasMapeadas.map((cat, i) => {
                                    const pct = totalCategorias > 0 ? ((cat.monto / totalCategorias) * 100).toFixed(1) : 0;
                                    const pctVentas = ventas > 0 ? ((cat.monto / ventas) * 100).toFixed(1) : null;
                                    const isMayor = i === 0;
                                    return (
                                        <div key={cat.nombre} className={`p-3 border ${isMayor ? 'border-[var(--color-signal)]/40 bg-[var(--color-signal)]/5' : 'border-[var(--color-obsidian-border)] bg-white/[0.02]'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {isMayor && <AlertTriangle size={13} className="text-[var(--color-signal)] shrink-0" />}
                                                    <span className={`text-xs font-black uppercase tracking-widest ${isMayor ? 'text-white' : 'text-gray-300'}`}>{cat.nombre}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {pctVentas && (
                                                        <span className="flex items-center gap-1 text-[10px] font-black text-gray-500">
                                                            <Percent size={10} /> {pctVentas}% s/ventas
                                                        </span>
                                                    )}
                                                    <span className="font-black text-white text-sm">{formatPesos(cat.monto)}</span>
                                                </div>
                                            </div>
                                            {/* Barra de progreso */}
                                            <div className="w-full bg-[var(--color-obsidian)] h-1.5">
                                                <div
                                                    className={`h-1.5 transition-all duration-700 ${isMayor ? 'bg-[var(--color-signal)]' : 'bg-[var(--color-gold)]'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-600 font-bold mt-1 text-right">{pct}% del gasto total</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
            </div>

            {/* ── Top 10 productos más caros ─────────────────────────────────── */}
            {top10Productos.length > 0 && (
                <div className="glass-panel overflow-hidden border border-[var(--color-obsidian-border)]">
                    <div className="px-5 py-4 border-b border-[var(--color-obsidian-border)] flex items-center justify-between">
                        <h3 className="font-black text-[var(--color-gold)] uppercase tracking-widest text-sm flex items-center gap-2">
                            <DollarSign size={16} /> Top 10 — Productos Mayor Costo de Uso
                        </h3>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Período actual</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-white min-w-[600px]">
                            <thead className="bg-[#111] text-[10px] text-gray-500 uppercase tracking-widest font-black border-b border-[var(--color-obsidian-border)]">
                                <tr>
                                    <th className="px-5 py-3 w-10 text-center">#</th>
                                    <th className="px-4 py-3">Producto</th>
                                    <th className="px-4 py-3">Categoría</th>
                                    <th className="px-4 py-3 text-center">Uso</th>
                                    <th className="px-4 py-3 text-right">Precio Unit.</th>
                                    <th className="px-4 py-3 text-right">Costo Total Uso</th>
                                    <th className="px-4 py-3 text-right">% s/Compras</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-obsidian-border)]">
                                {top10Productos.map((p, i) => {
                                    const pct = comprasTotales > 0 ? ((p.costoUso / comprasTotales) * 100).toFixed(1) : '—';
                                    return (
                                        <tr key={i} className={`hover:bg-white/5 transition-colors ${i === 0 ? 'bg-[var(--color-gold)]/5' : ''}`}>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`text-xs font-black ${i === 0 ? 'text-[var(--color-gold)]' : 'text-gray-600'}`}>
                                                    {i === 0 ? '★' : `${i + 1}`}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-black text-white text-xs">{p.producto}</td>
                                            <td className="px-4 py-3 font-bold text-gray-500 text-xs">{p.categoria}</td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-300 text-xs">{p.uso}</td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-300 text-xs">{formatPesos(p.precioUnitario)}</td>
                                            <td className="px-4 py-3 text-right font-black text-white">{formatPesos(p.costoUso)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-xs font-black ${i < 3 ? 'text-[var(--color-signal)]' : 'text-gray-400'}`}>{pct}%</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
