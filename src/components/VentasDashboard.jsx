import { useState } from 'react';
import { TrendingUp, DollarSign, Calendar, Plus, X, Download, Loader2 } from 'lucide-react';
import { KpiCard, ChartBox, TableWrapper, formatPesos } from './SharedComponents';
import { postVenta } from '../services/api';
import { exportJSONToExcel } from '../services/stockUtils';
import { useAppContext } from '../AppContext';

const MEDIOS_OPCIONES = ['Efectivo', 'Débito', 'Crédito', 'Mercado Pago', 'Transferencia'];
const TURNOS_OPCIONES = [
    { value: 'mañana', label: 'Mañana' },
    { value: 'tarde',  label: 'Tarde'  },
    { value: 'noche',  label: 'Noche'  },
];
const CANALES_FALLBACK = ['Mostrador', 'Delivery', 'PedidosYa', 'Rappi', 'Web'];

const formVacio = (canalDefault = '') => ({
    fecha:            new Date().toISOString().split('T')[0],
    total_venta:      '',
    turno:            'mañana',
    canal:            canalDefault,
    medios:           [{ medio: 'Efectivo', monto: '' }],
    total_declarado:  '',
    notas:            '',
});

export default function VentasDashboard({ data, onUpdate }) {
    const { showToast, setData, refreshData } = useAppContext();
    const [modalVenta, setModalVenta] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(formVacio());
    const [errores, setErrores] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const ventas = data.ventas || {};
    const porDia = ventas.porDia || [];

    // KPIs computados desde porDia (lista ya filtrada por n8n)
    const totalVentas = porDia.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const fechasUnicas = new Set(porDia.map(d => d.fecha).filter(Boolean));
    const promedioDiario = fechasUnicas.size > 0 ? totalVentas / fechasUnicas.size : 0;

    // Acumulado del mes en curso (independiente del filtro de fechas)
    const hoy = new Date();
    const ventasMesActual = porDia.filter(d => {
        const f = new Date(d.fecha);
        return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
    });
    const totalMesActual = ventasMesActual.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const subtituloMes = hoy.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

    // Turnos: sumar desde cada fila de porDia
    const turnosMap = {};
    for (const d of porDia) {
        if (d.turnos && typeof d.turnos === 'object') {
            for (const [t, v] of Object.entries(d.turnos)) {
                turnosMap[t] = (turnosMap[t] || 0) + (Number(v) || 0);
            }
        } else if (d.turno) {
            turnosMap[d.turno] = (turnosMap[d.turno] || 0) + (Number(d.total) || 0);
        }
    }
    const mejorTurno = Object.entries(turnosMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const turnosList = Object.entries(turnosMap)
        .map(([turno, total]) => ({ turno, total }))
        .sort((a, b) => b.total - a.total);

    // Medios de pago computados desde porDia
    const mediosMap = {};
    for (const d of porDia) {
        for (const m of (d.medios || [])) {
            if (m.medio) mediosMap[m.medio] = (mediosMap[m.medio] || 0) + (Number(m.monto) || 0);
        }
    }
    const porMedioPago = Object.entries(mediosMap).map(([name, value]) => ({ name, value }));

    // Canales: desde n8n (ventas.canales) con fallback estático
    const canalesDisponibles = (ventas.canales || []).length > 0
        ? ventas.canales.map(c => c.nombre)
        : CANALES_FALLBACK;

    // ── Diferencia auto-calculada ─────────────────────────────────────────────
    const totalVenta     = Number(form.total_venta    || 0);
    const totalDeclarado = Number(form.total_declarado || 0);
    const diferencia     = totalVenta - totalDeclarado;

    // ── Abrir formulario con canal default ────────────────────────────────────
    const abrirForm = () => {
        setForm(formVacio(canalesDisponibles[0] || ''));
        setErrores({});
        setShowForm(true);
    };

    // ── Validación ────────────────────────────────────────────────────────────
    const validar = () => {
        const e = {};
        if (!form.fecha)       e.fecha      = 'La fecha es requerida';
        if (totalVenta <= 0)   e.total_venta = 'El total de venta debe ser mayor a 0';
        if (!form.canal)       e.canal       = 'Seleccioná un canal de venta';
        return e;
    };

    const handleSubmit = async () => {
        const e = validar();
        setErrores(e);
        if (Object.keys(e).length > 0) return;
        setIsSubmitting(true);

        const payload = {
            fecha:           form.fecha,
            turno:           form.turno,
            canal:           form.canal,
            total_venta:     totalVenta,
            total_declarado: totalDeclarado,
            diferencia,
            medios: form.medios.map(m => ({ medio: m.medio, monto: Number(m.monto || 0) })),
            notas: form.notas,
            importe:         totalVenta,
        };

        try {
            await postVenta(payload);
            showToast('Venta registrada exitosamente', 'success');

            // Optimistic update — agregar al listado local sin recargar toda la página
            setData(prev => {
                const nuevoDia = {
                    fecha: form.fecha,
                    total: totalVenta,
                    canal: form.canal,
                    turnos: { [form.turno]: totalVenta },
                    medios: payload.medios,
                };
                return {
                    ...prev,
                    ventas: {
                        ...prev.ventas,
                        acumuladas: (prev.ventas?.acumuladas || 0) + totalVenta,
                        porDia: [nuevoDia, ...(prev.ventas?.porDia || [])],
                    },
                };
            });

            setForm(formVacio(canalesDisponibles[0] || ''));
            setShowForm(false);

            // Refrescar en background para sincronizar con n8n
            refreshData();
        } catch {
            showToast('Error al registrar la venta. Revisá la conexión con n8n.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addMedio = () => setForm(f => ({ ...f, medios: [...f.medios, { medio: 'Efectivo', monto: '' }] }));
    const removeMedio = (i) => setForm(f => ({ ...f, medios: f.medios.filter((_, idx) => idx !== i) }));
    const updateMedio = (i, campo, val) => setForm(f => ({
        ...f,
        medios: f.medios.map((m, idx) => idx === i ? { ...m, [campo]: val } : m)
    }));

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPIs */}
            <div className="kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <KpiCard title="Ventas Mes" amount={formatPesos(totalMesActual || totalVentas)} subtitle={subtituloMes} color="border-teal-700" icon={<TrendingUp className="text-teal-700" />} />
                <KpiCard title="Promedio Diario" amount={formatPesos(promedioDiario)} color="border-pink-700" icon={<DollarSign className="text-pink-700" />} />
                <KpiCard title="Mejor Turno" amount={mejorTurno} color="border-blue-700" icon={<Calendar className="text-blue-700" />} />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lista tabular de turnos */}
                <div className="glass-panel overflow-hidden border border-[var(--color-obsidian-border)] h-full">
                    <div className="px-5 py-4 border-b border-[var(--color-obsidian-border)] flex items-center justify-between">
                        <h3 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2">
                            <Calendar size={16} className="text-[var(--color-gold)]" /> Ventas por Turno
                        </h3>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Período filtrado</span>
                    </div>
                    {turnosList.length === 0 ? (
                        <p className="px-5 py-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">Sin datos</p>
                    ) : (
                        <div className="divide-y divide-[var(--color-obsidian-border)]">
                            {turnosList.map(({ turno, total }) => {
                                const pct = totalVentas > 0 ? ((total / totalVentas) * 100).toFixed(1) : 0;
                                return (
                                    <div key={turno} className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                                        <span className="font-black text-white text-sm capitalize">{turno}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-bold text-gray-500">{pct}%</span>
                                            <span className="font-black text-[var(--color-gold)] text-sm">{formatPesos(total)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="flex items-center justify-between px-5 py-4 bg-white/[0.03]">
                                <span className="font-black text-gray-400 text-xs uppercase tracking-widest">Total</span>
                                <span className="font-black text-white text-base">{formatPesos(totalVentas)}</span>
                            </div>
                        </div>
                    )}
                </div>
                <ChartBox title="Medios de Pago" data={porMedioPago} type="pie" />
            </div>

            {/* Tabla diaria */}
            <TableWrapper
                title="Carga Diaria de Ventas"
                subtitle="Toca una fila para ver el detalle de cobro"
                action={
                    <div className="flex gap-2">
                        <button
                            onClick={() => exportJSONToExcel(ventas.porDia || [], `ventas_${new Date().toISOString().split('T')[0]}`)}
                            className="flex items-center gap-2 text-[var(--color-gold)] border border-[var(--color-gold)] px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-[var(--color-gold)] hover:text-black transition-all"
                        >
                            <Download size={14} /> Exportar
                        </button>
                        <button
                            onClick={abrirForm}
                            className="flex items-center gap-2 bg-[var(--color-gold)] text-black px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all"
                        >
                            <Plus size={14} /> Registrar
                        </button>
                    </div>
                }
            >
                <table className="w-full text-sm text-white">
                    <thead className="bg-[#111111] border-b border-[var(--color-obsidian-border)] text-[11px] uppercase tracking-wider font-semibold text-[var(--color-gold)]">
                        <tr>
                            <th className="px-4 py-3 text-center">Fecha</th>
                            <th className="px-4 py-3 text-center">Canal</th>
                            <th className="px-4 py-3 text-center">Turno</th>
                            <th className="px-4 py-3 text-center">Mañana</th>
                            <th className="px-4 py-3 text-center">Tarde</th>
                            <th className="px-4 py-3 text-center">Noche</th>
                            <th className="px-4 py-3 text-center">Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {(ventas.porDia || []).length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">Sin datos de ventas. Registrá el primer día.</td></tr>
                        ) : (ventas.porDia || []).map((d, i) => (
                            <tr key={i} onClick={() => setModalVenta(d)} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 cursor-pointer transition-colors">
                                <td className="px-4 py-3 text-center text-gray-200">{d.fecha}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{d.canal || '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-300 capitalize">{d.turno || '—'}</td>
                                <td className="px-4 py-3 text-center">{formatPesos(d.turnos?.mañana ?? d.turnos?.manana)}</td>
                                <td className="px-4 py-3 text-center">{formatPesos(d.turnos?.tarde)}</td>
                                <td className="px-4 py-3 text-center">{formatPesos(d.turnos?.noche)}</td>
                                <td className="px-4 py-3 text-center font-semibold text-white">{formatPesos(d.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableWrapper>

            {/* Modal detalle venta */}
            {modalVenta && (
                <div className="fixed inset-0 bg-[#1a1c23]/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
                        <div className="p-8 bg-gray-50 border-b flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-gray-800 uppercase tracking-tighter text-lg">Detalle Cobro</h3>
                                <span className="text-xs font-bold text-teal-500">{modalVenta.fecha}</span>
                                {modalVenta.canal && <span className="text-xs font-bold text-gray-400 ml-2">— {modalVenta.canal}</span>}
                            </div>
                            <button onClick={() => setModalVenta(null)}><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-4">
                            {(modalVenta.medios || []).map((m, i) => (
                                <div key={i} className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                                    <span className="text-gray-500 font-bold text-xs uppercase">{m.medio}</span>
                                    <span className="font-black text-gray-900 text-sm">{formatPesos(m.monto)}</span>
                                </div>
                            ))}
                            <div className="pt-6 flex justify-between items-center border-t-2 border-gray-900 mt-4">
                                <span className="font-black text-lg">TOTAL</span>
                                <span className="font-black text-2xl text-teal-600">{formatPesos(modalVenta.total)}</span>
                            </div>
                        </div>
                        <button onClick={() => setModalVenta(null)} className="w-full bg-[#1a1c23] text-white p-6 font-black hover:bg-gray-800 uppercase tracking-widest text-xs">Cerrar</button>
                    </div>
                </div>
            )}

            {/* Modal formulario nueva venta */}
            {showForm && (
                <div className="modal-overlay fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="modal-panel bg-[var(--color-obsidian-light)] border border-[var(--color-obsidian-border)] w-full sm:max-w-lg sm:rounded-lg shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-[var(--color-obsidian-border)] flex justify-between items-center">
                            <h3 className="font-black text-[var(--color-gold)] uppercase tracking-widest text-sm">Registrar Venta del Día</h3>
                            <button onClick={() => { setShowForm(false); setErrores({}); }} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                            {/* Fecha */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={form.fecha}
                                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                />
                                {errores.fecha && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.fecha}</p>}
                            </div>

                            {/* Canal de venta */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Canal de Venta</label>
                                <select
                                    value={form.canal}
                                    onChange={e => setForm(f => ({ ...f, canal: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                >
                                    <option value="">— Seleccioná un canal —</option>
                                    {canalesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {errores.canal && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.canal}</p>}
                            </div>

                            {/* Turno */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Turno</label>
                                <select
                                    value={form.turno}
                                    onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                >
                                    {TURNOS_OPCIONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            {/* Total venta */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Venta $</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={form.total_venta}
                                    onChange={e => setForm(f => ({ ...f, total_venta: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                />
                                {errores.total_venta && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.total_venta}</p>}
                            </div>

                            {/* Medios de pago */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Medios de Pago</label>
                                    <button onClick={addMedio} className="text-[var(--color-gold)] text-xs font-black hover:text-white transition-colors flex items-center gap-1"><Plus size={12} /> Agregar</button>
                                </div>
                                {form.medios.map((m, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <select
                                            value={m.medio}
                                            onChange={e => updateMedio(i, 'medio', e.target.value)}
                                            className="flex-1 bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-3 py-2 text-xs font-bold focus:border-[var(--color-gold)] outline-none"
                                        >
                                            {MEDIOS_OPCIONES.map(op => <option key={op}>{op}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            placeholder="Monto"
                                            value={m.monto}
                                            onChange={e => updateMedio(i, 'monto', e.target.value)}
                                            className="w-32 bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-3 py-2 text-xs font-bold focus:border-[var(--color-gold)] outline-none"
                                        />
                                        {form.medios.length > 1 && (
                                            <button onClick={() => removeMedio(i)} className="text-gray-500 hover:text-[var(--color-signal)] transition-colors"><X size={16} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Total declarado */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Declarado $</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={form.total_declarado}
                                    onChange={e => setForm(f => ({ ...f, total_declarado: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                />
                            </div>

                            {/* Notas (opcional) */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Notas (opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Evento especial, promoción, etc."
                                    value={form.notas}
                                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                />
                            </div>

                            {/* Diferencia (auto-calculada) */}
                            <div className="bg-black/30 border border-[var(--color-obsidian-border)] px-4 py-3 flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Diferencia $</span>
                                <span className={`text-sm font-black ${diferencia === 0 ? 'text-green-400' : diferencia > 0 ? 'text-[var(--color-gold)]' : 'text-[var(--color-signal)]'}`}>
                                    {diferencia >= 0 ? '+' : ''}{formatPesos(diferencia)}
                                </span>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-[var(--color-obsidian-border)] flex justify-end gap-3">
                            <button onClick={() => { setShowForm(false); setErrores({}); }} className="px-4 py-2.5 text-xs font-black text-gray-400 hover:text-white uppercase tracking-widest transition-colors">Cancelar</button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 bg-[var(--color-gold)] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : 'Registrar Venta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
