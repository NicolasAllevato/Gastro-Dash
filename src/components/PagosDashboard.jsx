import { useState } from 'react';
import { CreditCard, Plus, X, Loader2 } from 'lucide-react';
import { KpiCard, ChartBox, TableWrapper, formatPesos } from './SharedComponents';
import { postPago } from '../services/api';
import { useAppContext } from '../AppContext';

const MEDIOS_PAGO = ['Transferencia', 'Efectivo', 'Cheque', 'Débito', 'Crédito'];

const formFacturaVacio = () => ({
    factura_id: '',
    tipo_pago: 'Total',
    monto: '',
    medio: 'Transferencia',
    fecha: new Date().toISOString().split('T')[0],
});

const formCompraVacio = () => ({
    proveedor: '',
    categoria: '',
    concepto: '',
    monto: '',
    medio: 'Transferencia',
    fecha: new Date().toISOString().split('T')[0],
});

export default function PagosDashboard({ data, onUpdate }) {
    const { showToast, setData, refreshData } = useAppContext();
    const [showForm, setShowForm]   = useState(false);
    const [modo, setModo]           = useState('factura'); // 'factura' | 'compra'
    const [formFactura, setFormFactura] = useState(formFacturaVacio());
    const [formCompra, setFormCompra]   = useState(formCompraVacio());
    const [errores, setErrores]     = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filtroMedio, setFiltroMedio] = useState('Todos');

    const pagos     = data.pagos     || {};
    const kpis      = pagos.kpis     || {};
    const lista     = pagos.lista    || [];

    // Datos derivados para los selects (de Sheets via n8n)
    const facturasImpagas = (data.facturas?.lista || []).filter(
        f => f.estado === 'Impaga' || f.estado === 'Pendiente' || f.estado === 'impaga' || f.estado === 'pendiente'
    );
    const proveedoresUnicos = [
        ...new Set([
            ...(data.compras?.rankingDeuda || []).map(r => r.proveedor),
            ...(data.compras?.facturas     || []).map(f => f.proveedor),
        ].filter(Boolean)),
    ].sort();
    const categoriasUnicas = [
        ...new Set((data.compras?.porCategoria || []).map(c => c.name).filter(Boolean)),
    ].sort();

    const mediosUnicos = ['Todos', ...new Set(lista.map(p => p.medio).filter(Boolean))];
    const listaFiltrada = filtroMedio === 'Todos' ? lista : lista.filter(p => p.medio === filtroMedio);

    // Cuando se selecciona una factura en modo Total, auto-completa el monto
    const handleFacturaSelect = (id) => {
        const fac = facturasImpagas.find(f => String(f.id) === String(id));
        setFormFactura(f => ({
            ...f,
            factura_id: id,
            monto: f.tipo_pago === 'Total' && fac ? String(fac.monto) : f.monto,
        }));
    };

    const handleTipoPagoChange = (tipo) => {
        const fac = facturasImpagas.find(f => String(f.id) === String(formFactura.factura_id));
        setFormFactura(f => ({
            ...f,
            tipo_pago: tipo,
            monto: tipo === 'Total' && fac ? String(fac.monto) : '',
        }));
    };

    const validarFactura = () => {
        const e = {};
        if (!formFactura.factura_id)                      e.factura_id = 'Seleccioná una factura';
        if (!formFactura.monto || Number(formFactura.monto) <= 0) e.monto = 'El monto debe ser mayor a 0';
        if (!formFactura.fecha)                           e.fecha = 'La fecha es requerida';
        return e;
    };

    const validarCompra = () => {
        const e = {};
        if (!formCompra.proveedor) e.proveedor = 'Seleccioná un proveedor';
        if (!formCompra.categoria) e.categoria = 'Seleccioná una categoría';
        if (!formCompra.monto || Number(formCompra.monto) <= 0) e.monto = 'El monto debe ser mayor a 0';
        if (!formCompra.fecha)     e.fecha = 'La fecha es requerida';
        return e;
    };

    const cerrarForm = () => {
        setShowForm(false);
        setErrores({});
        setFormFactura(formFacturaVacio());
        setFormCompra(formCompraVacio());
    };

    const handleSubmit = async () => {
        const e = modo === 'factura' ? validarFactura() : validarCompra();
        setErrores(e);
        if (Object.keys(e).length > 0) return;
        setIsSubmitting(true);
        try {
            if (modo === 'factura') {
                const fac = facturasImpagas.find(f => String(f.id) === String(formFactura.factura_id));
                await postPago({
                    tipo: 'factura',
                    factura_id:  formFactura.factura_id,
                    proveedor:   fac?.proveedor || '',
                    tipo_pago:   formFactura.tipo_pago,
                    monto:       Number(formFactura.monto),
                    medio:       formFactura.medio,
                    fecha:       formFactura.fecha,
                    concepto:    `Pago ${formFactura.tipo_pago} — Factura #${formFactura.factura_id}`,
                });
            } else {
                await postPago({
                    tipo:      'compra',
                    proveedor: formCompra.proveedor,
                    categoria: formCompra.categoria,
                    concepto:  formCompra.concepto || `Compra — ${formCompra.categoria}`,
                    monto:     Number(formCompra.monto),
                    medio:     formCompra.medio,
                    fecha:     formCompra.fecha,
                });
            }
            showToast('Pago registrado exitosamente', 'success');

            // Optimistic update — agregar el pago a la lista local
            const nuevoPago = modo === 'factura'
                ? {
                    fecha: formFactura.fecha,
                    concepto: `Pago ${formFactura.tipo_pago} — Factura #${formFactura.factura_id}`,
                    proveedor: facturasImpagas.find(f => String(f.id) === String(formFactura.factura_id))?.proveedor || '',
                    medio: formFactura.medio,
                    monto: Number(formFactura.monto),
                    estado: 'Confirmado',
                }
                : {
                    fecha: formCompra.fecha,
                    concepto: formCompra.concepto || `Compra — ${formCompra.categoria}`,
                    proveedor: formCompra.proveedor,
                    medio: formCompra.medio,
                    monto: Number(formCompra.monto),
                    estado: 'Confirmado',
                };

            setData(prev => ({
                ...prev,
                pagos: {
                    ...prev.pagos,
                    lista: [nuevoPago, ...(prev.pagos?.lista || [])],
                },
            }));

            cerrarForm();
            // Sync en background
            refreshData();
        } catch {
            showToast('Error al registrar el pago', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPIs */}
            <div className="kpi-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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

            {/* Modal nuevo pago — dual modo */}
            {showForm && (
                <div className="modal-overlay fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="modal-panel bg-[var(--color-obsidian-light)] border border-[var(--color-obsidian-border)] w-full sm:max-w-lg sm:rounded-lg shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-[var(--color-obsidian-border)] flex justify-between items-center">
                            <h3 className="font-black text-[var(--color-gold)] uppercase tracking-widest text-sm">Registrar Pago</h3>
                            <button onClick={cerrarForm} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>

                        {/* Selector de modo */}
                        <div className="flex border-b border-[var(--color-obsidian-border)]">
                            {[
                                { id: 'factura', label: 'Pago de Factura' },
                                { id: 'compra',  label: 'Compra Básica'   },
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => { setModo(m.id); setErrores({}); }}
                                    className={`flex-1 px-4 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${
                                        modo === m.id
                                            ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                                            : 'border-transparent text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {modo === 'factura' ? (
                                <>
                                    {/* Seleccionar factura impaga */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Factura Impaga</label>
                                        {facturasImpagas.length === 0 ? (
                                            <p className="text-xs text-gray-500 font-bold py-2">No hay facturas impagas registradas.</p>
                                        ) : (
                                            <select
                                                value={formFactura.factura_id}
                                                onChange={e => handleFacturaSelect(e.target.value)}
                                                className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                            >
                                                <option value="">— Seleccioná una factura —</option>
                                                {facturasImpagas.map((f, i) => (
                                                    <option key={i} value={f.id}>
                                                        #{f.id} — {f.proveedor} — {formatPesos(f.monto)}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        {errores.factura_id && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.factura_id}</p>}
                                    </div>
                                    {/* Tipo de pago */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tipo de Pago</label>
                                        <div className="flex gap-2">
                                            {['Total', 'Parcial'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => handleTipoPagoChange(t)}
                                                    className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest border transition-all ${
                                                        formFactura.tipo_pago === t
                                                            ? 'bg-[var(--color-gold)] text-black border-[var(--color-gold)]'
                                                            : 'bg-transparent text-gray-400 border-[var(--color-obsidian-border)] hover:border-[var(--color-gold)] hover:text-white'
                                                    }`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Monto */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Monto $</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={formFactura.monto}
                                            readOnly={formFactura.tipo_pago === 'Total'}
                                            onChange={e => setFormFactura(f => ({ ...f, monto: e.target.value }))}
                                            className={`w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold outline-none ${formFactura.tipo_pago === 'Total' ? 'opacity-60 cursor-not-allowed' : 'focus:border-[var(--color-gold)]'}`}
                                        />
                                        {errores.monto && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.monto}</p>}
                                    </div>
                                    {/* Medio de pago */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Medio de Pago</label>
                                        <select
                                            value={formFactura.medio}
                                            onChange={e => setFormFactura(f => ({ ...f, medio: e.target.value }))}
                                            className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                        >
                                            {MEDIOS_PAGO.map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    {/* Fecha */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            value={formFactura.fecha}
                                            onChange={e => setFormFactura(f => ({ ...f, fecha: e.target.value }))}
                                            className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                        />
                                        {errores.fecha && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.fecha}</p>}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Proveedor (de Sheets) */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Proveedor</label>
                                        {proveedoresUnicos.length === 0 ? (
                                            <p className="text-xs text-gray-500 font-bold py-2">Sin proveedores cargados en Sheets.</p>
                                        ) : (
                                            <select
                                                value={formCompra.proveedor}
                                                onChange={e => setFormCompra(f => ({ ...f, proveedor: e.target.value }))}
                                                className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                            >
                                                <option value="">— Seleccioná proveedor —</option>
                                                {proveedoresUnicos.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        )}
                                        {errores.proveedor && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.proveedor}</p>}
                                    </div>
                                    {/* Categoría (de Sheets) */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Categoría</label>
                                        {categoriasUnicas.length === 0 ? (
                                            <p className="text-xs text-gray-500 font-bold py-2">Sin categorías cargadas en Sheets.</p>
                                        ) : (
                                            <select
                                                value={formCompra.categoria}
                                                onChange={e => setFormCompra(f => ({ ...f, categoria: e.target.value }))}
                                                className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                            >
                                                <option value="">— Seleccioná categoría —</option>
                                                {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        )}
                                        {errores.categoria && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.categoria}</p>}
                                    </div>
                                    {/* Concepto (descripción libre, opcional) */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Descripción (opcional)</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Compra semanal de verduras"
                                            value={formCompra.concepto}
                                            onChange={e => setFormCompra(f => ({ ...f, concepto: e.target.value }))}
                                            className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                        />
                                    </div>
                                    {/* Monto */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Monto $</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={formCompra.monto}
                                            onChange={e => setFormCompra(f => ({ ...f, monto: e.target.value }))}
                                            className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                        />
                                        {errores.monto && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.monto}</p>}
                                    </div>
                                    {/* Medio de pago */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Medio de Pago</label>
                                        <select
                                            value={formCompra.medio}
                                            onChange={e => setFormCompra(f => ({ ...f, medio: e.target.value }))}
                                            className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                        >
                                            {MEDIOS_PAGO.map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    {/* Fecha */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            value={formCompra.fecha}
                                            onChange={e => setFormCompra(f => ({ ...f, fecha: e.target.value }))}
                                            className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                        />
                                        {errores.fecha && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{errores.fecha}</p>}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-[var(--color-obsidian-border)] flex justify-end gap-3">
                            <button onClick={cerrarForm} className="px-4 py-2.5 text-xs font-black text-gray-400 hover:text-white uppercase tracking-widest">Cancelar</button>
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
