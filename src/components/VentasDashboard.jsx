import { useState } from 'react';
import { TrendingUp, DollarSign, Calendar, Plus, X, Download, Loader2 } from 'lucide-react';
import { KpiCard, ChartBox, TableWrapper, formatPesos } from './SharedComponents';
import { postVenta } from '../services/api';
import { exportJSONToExcel } from '../services/stockUtils';
import { useAppContext } from '../AppContext';

const MEDIOS_OPCIONES = ['Efectivo', 'Débito', 'Crédito', 'Mercado Pago', 'Transferencia'];

const formVacio = () => ({
    fecha: new Date().toISOString().split('T')[0],
    manana: '',
    tarde: '',
    noche: '',
    medios: [{ medio: 'Efectivo', monto: '' }],
});

export default function VentasDashboard({ data, onUpdate }) {
    const { showToast } = useAppContext();
    const [modalVenta, setModalVenta] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(formVacio());
    const [errores, setErrores] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const ventas = data.ventas || {};

    // ── Validación ────────────────────────────────────────────────────────────
    const validar = () => {
        const e = {};
        const total = Number(form.manana || 0) + Number(form.tarde || 0) + Number(form.noche || 0);
        if (!form.fecha) e.fecha = 'La fecha es requerida';
        if (total <= 0) e.total = 'Al menos un turno debe tener monto mayor a 0';
        const sumamedios = form.medios.reduce((s, m) => s + Number(m.monto || 0), 0);
        if (form.medios.length > 0 && Math.abs(sumamedios - total) > 1) {
            e.medios = `La suma de medios ($${sumamedios.toLocaleString()}) debe coincidir con el total de turnos ($${total.toLocaleString()})`;
        }
        return e;
    };

    const handleSubmit = async () => {
        const e = validar();
        setErrores(e);
        if (Object.keys(e).length > 0) return;
        setIsSubmitting(true);
        try {
            await postVenta({
                fecha: form.fecha,
                turnos: {
                    manana: Number(form.manana || 0),
                    tarde: Number(form.tarde || 0),
                    noche: Number(form.noche || 0),
                },
                medios: form.medios.map(m => ({ medio: m.medio, monto: Number(m.monto || 0) })),
                total: Number(form.manana || 0) + Number(form.tarde || 0) + Number(form.noche || 0),
            });
            showToast('Venta registrada exitosamente', 'success');
            setForm(formVacio());
            setShowForm(false);
            onUpdate();
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <KpiCard title="Ventas Acumuladas" amount={formatPesos(ventas.acumuladas)} color="border-teal-700" icon={<TrendingUp className="text-teal-700" />} />
                <KpiCard title="Promedio Diario" amount={formatPesos(ventas.promedioDiario || 0)} color="border-pink-700" icon={<DollarSign className="text-pink-700" />} />
                <KpiCard title="Mejor Turno" amount={ventas.mejorTurno || '—'} color="border-blue-700" icon={<Calendar className="text-blue-700" />} />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartBox title="Ventas por Turno" data={ventas.porTurno || []} type="bar" />
                <ChartBox title="Medios de Pago" data={ventas.porMedioPago || []} type="pie" />
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
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 bg-[var(--color-gold)] text-black px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all"
                        >
                            <Plus size={14} /> Registrar
                        </button>
                    </div>
                }
            >
                <table className="w-full text-base lg:text-xl text-white">
                    <thead className="bg-[#111111] border-b border-[var(--color-obsidian-border)] text-[12px] lg:text-sm uppercase font-black text-[var(--color-gold)]">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th>Mañana</th>
                            <th>Tarde</th>
                            <th>Noche</th>
                            <th className="text-right px-6">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(ventas.porDia || []).length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-bold text-sm">Sin datos de ventas. Registrá el primer día.</td></tr>
                        ) : (ventas.porDia || []).map((d, i) => (
                            <tr key={i} onClick={() => setModalVenta(d)} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 cursor-pointer transition-colors">
                                <td className="px-6 py-4 font-bold">{d.fecha}</td>
                                <td className="font-bold">{formatPesos(d.turnos?.manana)}</td>
                                <td className="font-bold">{formatPesos(d.turnos?.tarde)}</td>
                                <td className="font-bold">{formatPesos(d.turnos?.noche)}</td>
                                <td className="px-6 py-4 text-right font-black">{formatPesos(d.total)}</td>
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-[var(--color-obsidian-light)] border border-[var(--color-obsidian-border)] w-full max-w-lg rounded-lg shadow-2xl overflow-hidden">
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
                            {/* Turnos */}
                            <div className="grid grid-cols-3 gap-3">
                                {[['manana', 'Mañana'], ['tarde', 'Tarde'], ['noche', 'Noche']].map(([key, label]) => (
                                    <div key={key}>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={form[key]}
                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                            className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-3 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                            {errores.total && <p className="text-[var(--color-signal)] text-xs font-bold">{errores.total}</p>}
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
                                {errores.medios && <p className="text-[var(--color-signal)] text-xs font-bold mt-1">{errores.medios}</p>}
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
