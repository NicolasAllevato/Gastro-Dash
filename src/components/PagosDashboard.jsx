import { useState } from 'react';
import { CreditCard, Plus, X, Loader2 } from 'lucide-react';
import { KpiCard, ChartBox, TableWrapper, formatPesos } from './SharedComponents';
import { postPago } from '../services/api';
import { useAppContext } from '../AppContext';

const MEDIOS_PAGO = ['Transferencia', 'Efectivo', 'Cheque', 'Débito', 'Crédito'];

const formVacio = () => ({
    concepto: '',
    proveedor: '',
    monto: '',
    medio: 'Transferencia',
    fecha: new Date().toISOString().split('T')[0],
});

export default function PagosDashboard({ data, onUpdate }) {
    const { showToast } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(formVacio());
    const [errores, setErrores] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filtroMedio, setFiltroMedio] = useState('Todos');

    const pagos = data.pagos || {};
    const kpis = pagos.kpis || {};
    const lista = pagos.lista || [];

    const mediosUnicos = ['Todos', ...new Set(lista.map(p => p.medio).filter(Boolean))];
    const listaFiltrada = filtroMedio === 'Todos' ? lista : lista.filter(p => p.medio === filtroMedio);

    const validar = () => {
        const e = {};
        if (!form.concepto.trim()) e.concepto = 'El concepto es requerido';
        if (!form.monto || Number(form.monto) <= 0) e.monto = 'El monto debe ser mayor a 0';
        if (!form.fecha) e.fecha = 'La fecha es requerida';
        return e;
    };

    const handleSubmit = async () => {
        const e = validar();
        setErrores(e);
        if (Object.keys(e).length > 0) return;
        setIsSubmitting(true);
        try {
            await postPago({
                concepto: form.concepto,
                proveedor: form.proveedor,
                monto: Number(form.monto),
                medio: form.medio,
                fecha: form.fecha,
            });
            showToast('Pago registrado exitosamente', 'success');
            setForm(formVacio());
            setShowForm(false);
            onUpdate();
        } catch {
            showToast('Error al registrar el pago', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total Pagado" amount={formatPesos(kpis.total)} color="border-teal-800" icon={<CreditCard className="text-teal-400" />} />
                <KpiCard title="Mercadería" amount={formatPesos(kpis.cat?.m)} color="border-amber-800" icon={<CreditCard className="text-amber-400" />} />
                <KpiCard title="RRHH" amount={formatPesos(kpis.cat?.r)} color="border-blue-800" icon={<CreditCard className="text-blue-400" />} />
                <KpiCard title="% s/Venta" amount={kpis.peso != null ? `${kpis.peso}%` : '—'} color="border-pink-800" icon={<CreditCard className="text-pink-400" />} />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartBox title="Pagos por Medio" data={pagos.porMedio || []} type="pie" />
                <ChartBox title="Flujo de Salida Diario" data={pagos.salidaDia || []} type="bar" xKey="name" />
            </div>

            {/* Lista de pagos */}
            <TableWrapper
                title="Historial de Pagos"
                action={
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex gap-1">
                            {mediosUnicos.map(m => (
                                <button
                                    key={m}
                                    onClick={() => setFiltroMedio(m)}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-all ${filtroMedio === m ? 'bg-[var(--color-gold)] text-black border-[var(--color-gold)]' : 'border-[var(--color-obsidian-border)] text-gray-400 hover:border-[var(--color-gold)] hover:text-white'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 bg-[var(--color-gold)] text-black px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all"
                        >
                            <Plus size={14} /> Registrar
                        </button>
                    </div>
                }
            >
                <table className="w-full text-base text-left text-white min-w-[700px]">
                    <thead className="bg-[#111111] border-b border-[var(--color-obsidian-border)] text-[12px] uppercase font-black text-[var(--color-gold)]">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th>Concepto</th>
                            <th>Proveedor</th>
                            <th>Medio</th>
                            <th className="text-right px-6">Monto</th>
                            <th className="text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listaFiltrada.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-bold text-sm">No hay pagos registrados.</td></tr>
                        ) : listaFiltrada.map((p, i) => (
                            <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-400">{p.fecha}</td>
                                <td className="font-bold">{p.concepto}</td>
                                <td className="font-bold text-gray-400">{p.proveedor || '—'}</td>
                                <td><span className="border border-[var(--color-obsidian-border)] px-2 py-0.5 text-[10px] font-black uppercase text-gray-400">{p.medio}</span></td>
                                <td className="text-right px-6 font-black">{formatPesos(p.monto)}</td>
                                <td className="text-center">
                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase border ${p.estado === 'Confirmado' ? 'border-[var(--color-acid)] text-[var(--color-acid)]' : 'border-[var(--color-gold)] text-[var(--color-gold)]'}`}>
                                        {p.estado || 'Confirmado'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableWrapper>

            {/* Modal nuevo pago */}
            {showForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-[var(--color-obsidian-light)] border border-[var(--color-obsidian-border)] w-full max-w-md rounded-lg shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-[var(--color-obsidian-border)] flex justify-between items-center">
                            <h3 className="font-black text-[var(--color-gold)] uppercase tracking-widest text-sm">Registrar Pago</h3>
                            <button onClick={() => { setShowForm(false); setErrores({}); }} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {[
                                { key: 'concepto', label: 'Concepto', type: 'text', placeholder: 'Ej: Compra de carnes' },
                                { key: 'proveedor', label: 'Proveedor (opcional)', type: 'text', placeholder: 'Ej: Frigorífico Central' },
                                { key: 'monto', label: 'Monto ($)', type: 'number', placeholder: '0' },
                                { key: 'fecha', label: 'Fecha', type: 'date', placeholder: '' },
                            ].map(({ key, label, type, placeholder }) => (
                                <div key={key}>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
                                    <input
                                        type={type}
                                        placeholder={placeholder}
                                        value={form[key]}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                    />
                                    {errores[key] && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores[key]}</p>}
                                </div>
                            ))}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Medio de Pago</label>
                                <select
                                    value={form.medio}
                                    onChange={e => setForm(f => ({ ...f, medio: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                >
                                    {MEDIOS_PAGO.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-[var(--color-obsidian-border)] flex justify-end gap-3">
                            <button onClick={() => { setShowForm(false); setErrores({}); }} className="px-4 py-2.5 text-xs font-black text-gray-400 hover:text-white uppercase tracking-widest">Cancelar</button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 bg-[var(--color-gold)] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : 'Registrar Pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
