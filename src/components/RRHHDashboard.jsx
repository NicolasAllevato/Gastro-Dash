import { useState } from 'react';
import { Users, X, Loader2, Plus, UserCheck, UserX, Clock, AlertCircle } from 'lucide-react';
import { KpiCard, TableWrapper, formatPesos } from './SharedComponents';
import { postValeRRHH } from '../services/api';
import { useAppContext } from '../AppContext';

const ESTADOS_EMPLEADO = [
    { value: 'Activo',   label: 'Activo',   color: 'border-[var(--color-acid)] text-[var(--color-acid)]',     icon: UserCheck },
    { value: 'Licencia', label: 'Licencia', color: 'border-[var(--color-gold)] text-[var(--color-gold)]',     icon: Clock     },
    { value: 'Ausente',  label: 'Ausente',  color: 'border-orange-400 text-orange-400',                       icon: AlertCircle },
    { value: 'Baja',     label: 'Baja',     color: 'border-[var(--color-signal)] text-[var(--color-signal)]', icon: UserX     },
];

const badgeEstado = (estado) => {
    const e = ESTADOS_EMPLEADO.find(e => e.value === estado);
    return e ? e.color : 'border-gray-600 text-gray-500';
};

export default function RRHHDashboard({ data, onUpdate }) {
    const { showToast, setData, refreshData } = useAppContext();
    const [modalVale, setModalVale] = useState(null);
    const [formVale, setFormVale] = useState({ monto: '', concepto: '' });
    const [errores, setErrores] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cambioEstadoId, setCambioEstadoId] = useState(null); // loading por empleado

    const rrhh = data.rrhh || {};
    const kpis = rrhh.kpis || {};
    const empleados = rrhh.empleados || [];

    const validar = (empleado) => {
        const e = {};
        if (!formVale.monto || Number(formVale.monto) <= 0) e.monto = 'El monto debe ser mayor a 0';
        if (Number(formVale.monto) > (empleado?.sueldo || 0)) e.monto = `El vale no puede superar el sueldo base (${formatPesos(empleado?.sueldo)})`;
        if (!formVale.concepto.trim()) e.concepto = 'El concepto es requerido';
        return e;
    };

    const handleRegistrarVale = async (empleado) => {
        const e = validar(empleado);
        setErrores(e);
        if (Object.keys(e).length > 0) return;
        setIsSubmitting(true);
        try {
            await postValeRRHH({
                action: 'registrar_vale',
                empleadoId: empleado.id,
                empleadoNombre: empleado.nombre,
                puesto: empleado.puesto || '',
                monto: Number(formVale.monto),
                concepto: formVale.concepto,
                fecha: new Date().toISOString().split('T')[0],
                tipo: 'adelanto',
                turno: '',
                local: '',
                estado: 'pendiente',
            });
            showToast(`Vale registrado para ${empleado.nombre}`, 'success');

            // Optimistic update — descontar vale del saldo
            setData(prev => ({
                ...prev,
                rrhh: {
                    ...prev.rrhh,
                    empleados: (prev.rrhh?.empleados || []).map(e =>
                        e.id === empleado.id
                            ? { ...e, vales: (e.vales || 0) + Number(formVale.monto) }
                            : e
                    ),
                },
            }));

            setModalVale(null);
            setFormVale({ monto: '', concepto: '' });
            refreshData();
        } catch {
            showToast('Error al registrar el vale', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCambiarEstado = async (empleado, nuevoEstado) => {
        if (empleado.estado === nuevoEstado) return;
        setCambioEstadoId(empleado.id);
        try {
            await postValeRRHH({
                action: 'cambiar_estado',
                empleadoId: empleado.id,
                empleadoNombre: empleado.nombre,
                nuevoEstado,
                fecha: new Date().toISOString().split('T')[0],
            });
            showToast(`${empleado.nombre} → ${nuevoEstado}`, 'success');

            // Optimistic update
            setData(prev => ({
                ...prev,
                rrhh: {
                    ...prev.rrhh,
                    empleados: (prev.rrhh?.empleados || []).map(e =>
                        e.id === empleado.id ? { ...e, estado: nuevoEstado } : e
                    ),
                },
            }));

            refreshData();
        } catch {
            showToast('Error al cambiar el estado', 'error');
        } finally {
            setCambioEstadoId(null);
        }
    };

    const abrirModal = (emp) => {
        setModalVale(emp);
        setFormVale({ monto: '', concepto: '' });
        setErrores({});
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPIs */}
            <div className="kpi-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                <KpiCard title="Sueldos a Pagar" amount={formatPesos(kpis.sueldosAPagar)} color="border-yellow-700" icon={<Users className="text-yellow-400" />} />
                <KpiCard title="Sueldos Pagados" amount={formatPesos(kpis.sueldosPagados)} color="border-green-700" icon={<Users className="text-green-400" />} />
                <KpiCard title="Total Vales" amount={formatPesos(kpis.totalVales)} color="border-pink-700" icon={<Users className="text-pink-400" />} />
                <KpiCard title="Personal Activo" amount={kpis.empleadosActivos ?? empleados.filter(e => e.estado === 'Activo').length} color="border-blue-700" icon={<Users className="text-blue-400" />} />
                <KpiCard title="Costo RRHH %" amount={kpis.costoRRHH != null ? `${kpis.costoRRHH}%` : '—'} color="border-teal-700" icon={<Users className="text-teal-400" />} />
            </div>

            {/* Tabla de liquidación */}
            <TableWrapper title="Liquidación Detallada">
                <table className="w-full text-sm text-left text-white min-w-[700px]">
                    <thead className="bg-[#111111] text-[12px] lg:text-sm font-black uppercase text-[var(--color-gold)] border-b border-[var(--color-obsidian-border)]">
                        <tr>
                            <th className="px-6 py-4">Nombre</th>
                            <th className="px-4 py-4">Puesto</th>
                            <th className="px-4 py-4">Estado</th>
                            <th className="px-4 py-4 text-right">Base</th>
                            <th className="px-4 py-4 text-right">Vales</th>
                            <th className="px-4 py-4 text-center">Saldo Neto</th>
                            <th className="px-4 py-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleados.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-bold text-sm">No hay empleados registrados.</td></tr>
                        ) : empleados.map((e, i) => (
                            <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-black text-white">{e.nombre}</td>
                                <td className="px-4 py-4"><span className="font-bold text-gray-400">{e.puesto}</span></td>
                                <td className="px-4 py-4">
                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase border ${badgeEstado(e.estado)}`}>
                                        {e.estado || 'Activo'}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right font-bold text-gray-300">{formatPesos(e.sueldo)}</td>
                                <td className="px-4 py-4 text-right font-black text-[var(--color-signal)]">{formatPesos(e.vales)}</td>
                                <td className="px-4 py-4 text-center font-black text-white">{formatPesos((e.sueldo || 0) - (e.vales || 0))}</td>
                                <td className="px-4 py-4 text-center">
                                    <button
                                        onClick={() => abrirModal(e)}
                                        className="flex items-center gap-1 mx-auto bg-[var(--color-gold)]/10 border border-[var(--color-gold)] text-[var(--color-gold)] px-2.5 py-1 text-[10px] font-black uppercase hover:bg-[var(--color-gold)] hover:text-black transition-all"
                                    >
                                        <Plus size={10} /> Vale
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {empleados.length > 0 && (
                            <tr className="bg-[var(--color-obsidian)] border-t-2 border-[var(--color-gold)]">
                                <td colSpan={5} className="px-6 py-4 font-black text-[var(--color-gold)] uppercase text-xs tracking-widest">Total Saldo Neto</td>
                                <td className="px-4 py-4 text-center font-black text-[var(--color-acid)] text-lg">
                                    {formatPesos(empleados.reduce((s, e) => s + (e.sueldo || 0) - (e.vales || 0), 0))}
                                </td>
                                <td />
                            </tr>
                        )}
                    </tbody>
                </table>
            </TableWrapper>

            {/* Sección Personal Activo */}
            <TableWrapper title="Personal Activo — Gestión de Estado">
                <table className="w-full text-sm text-left text-white min-w-[600px]">
                    <thead className="bg-[#111111] text-[12px] font-black uppercase text-[var(--color-gold)] border-b border-[var(--color-obsidian-border)]">
                        <tr>
                            <th className="px-6 py-4">Empleado</th>
                            <th className="px-4 py-4">Puesto</th>
                            <th className="px-4 py-4 text-center">Estado Actual</th>
                            <th className="px-4 py-4 text-center">Cambiar Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleados.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-bold text-sm">No hay empleados registrados.</td></tr>
                        ) : empleados.map((emp, i) => (
                            <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-black text-white">{emp.nombre}</td>
                                <td className="px-4 py-4 text-gray-400 font-bold">{emp.puesto}</td>
                                <td className="px-4 py-4 text-center">
                                    <span className={`px-2 py-1 text-[10px] font-black uppercase border ${badgeEstado(emp.estado)}`}>
                                        {emp.estado || 'Activo'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex gap-1.5 justify-center flex-wrap">
                                        {cambioEstadoId === emp.id ? (
                                            <span className="flex items-center gap-1 text-xs text-gray-400 font-bold">
                                                <Loader2 size={12} className="animate-spin" /> Actualizando...
                                            </span>
                                        ) : ESTADOS_EMPLEADO.map(est => (
                                            <button
                                                key={est.value}
                                                onClick={() => handleCambiarEstado(emp, est.value)}
                                                disabled={emp.estado === est.value}
                                                className={`px-2.5 py-1 text-[10px] font-black uppercase border transition-all ${
                                                    emp.estado === est.value
                                                        ? `${est.color} opacity-100 cursor-default`
                                                        : 'border-[var(--color-obsidian-border)] text-gray-500 hover:border-gray-400 hover:text-gray-300'
                                                }`}
                                            >
                                                {est.label}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableWrapper>

            {/* Modal registrar vale */}
            {modalVale && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-[var(--color-obsidian-light)] border border-[var(--color-obsidian-border)] w-full max-w-sm rounded-lg shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-[var(--color-obsidian-border)] flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-[var(--color-gold)] uppercase tracking-widest text-sm">Registrar Vale</h3>
                                <p className="text-xs font-bold text-gray-400 mt-0.5">{modalVale.nombre} — base: {formatPesos(modalVale.sueldo)}</p>
                            </div>
                            <button onClick={() => setModalVale(null)} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Monto ($)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={formVale.monto}
                                    onChange={e => setFormVale(f => ({ ...f, monto: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                />
                                {errores.monto && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.monto}</p>}
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Concepto</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Adelanto quincena"
                                    value={formVale.concepto}
                                    onChange={e => setFormVale(f => ({ ...f, concepto: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                />
                                {errores.concepto && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.concepto}</p>}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-[var(--color-obsidian-border)] flex justify-end gap-3">
                            <button onClick={() => setModalVale(null)} className="px-4 py-2.5 text-xs font-black text-gray-400 hover:text-white uppercase tracking-widest">Cancelar</button>
                            <button
                                onClick={() => handleRegistrarVale(modalVale)}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 bg-[var(--color-gold)] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : 'Registrar Vale'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
