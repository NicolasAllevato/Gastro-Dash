import { useState, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, FileText, Download, Sparkles, Loader2, Upload, CreditCard, X } from 'lucide-react';
import { KpiCard, TableWrapper, formatPesos } from './SharedComponents';
import { postFacturaUpdate, postFacturaUpload } from '../services/api';
import { useAppContext } from '../AppContext';

const ESTADOS = ['Todas', 'Pendiente', 'Pagada', 'Vencida'];
const MEDIOS_PAGO = ['Transferencia', 'Efectivo', 'Cheque', 'Débito', 'Crédito'];

const badgeStyle = {
    Pendiente: 'border-[var(--color-gold)] text-[var(--color-gold)]',
    Pagada: 'border-[var(--color-acid)] text-[var(--color-acid)]',
    Vencida: 'border-[var(--color-signal)] text-[var(--color-signal)]',
};

const PLANTILLA_VALE = `PLANTILLA DE VALE — GESTIÓN DE RRHH
=======================================
Fecha:
Empleado:
Puesto:
Local:
Monto: $
Tipo: (Anticipo / Descuento / Adelanto Vacaciones)
Turno: (Mañana / Tarde / Noche)
Concepto:
Nro. Comprobante:
=======================================
Instrucciones:
1. Completar todos los campos.
2. Firmar y sellar el comprobante.
3. Fotografiar o escanear y subir mediante "Cargar Vale".
`;

const modalPagoVacio = () => ({
    tipo_pago: 'Total',
    monto: '',
    medio: 'Transferencia',
    fecha: new Date().toISOString().split('T')[0],
    comprobante: '',
});

export default function FacturasDashboard({ data, onUpdate, onAskAi }) {
    const { showToast, setData, refreshData } = useAppContext();
    const [filtroEstado, setFiltroEstado] = useState('Todas');
    const [sortCol, setSortCol] = useState('vencimiento');
    const [sortAsc, setSortAsc] = useState(true);
    const [subiendoVale, setSubiendoVale] = useState(false);
    const valeInputRef = useRef(null);

    // Modal de pago
    const [modalPago, setModalPago] = useState({ isOpen: false, factura: null });
    const [formPago, setFormPago] = useState(modalPagoVacio());
    const [isPagando, setIsPagando] = useState(false);
    const [erroresPago, setErroresPago] = useState({});

    const facturas = data.facturas || {};
    const lista = facturas.lista || [];

    const filtrada = lista
        .filter(f => filtroEstado === 'Todas' || f.estado === filtroEstado)
        .sort((a, b) => {
            const va = a[sortCol === 'vencimiento' ? 'ven' : sortCol === 'monto' ? 'monto' : 'estado'] || '';
            const vb = b[sortCol === 'vencimiento' ? 'ven' : sortCol === 'monto' ? 'monto' : 'estado'] || '';
            if (va < vb) return sortAsc ? -1 : 1;
            if (va > vb) return sortAsc ? 1 : -1;
            return 0;
        });

    const toggleSort = (col) => {
        if (sortCol === col) setSortAsc(!sortAsc);
        else { setSortCol(col); setSortAsc(true); }
    };

    const sortIndicator = (col) => sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : '';

    // ── Abrir modal de pago ───────────────────────────────────────────────────
    const abrirModalPago = (factura) => {
        setFormPago({ ...modalPagoVacio(), monto: String(factura.monto || '') });
        setErroresPago({});
        setModalPago({ isOpen: true, factura });
    };

    const cerrarModalPago = () => {
        setModalPago({ isOpen: false, factura: null });
        setFormPago(modalPagoVacio());
        setErroresPago({});
    };

    const handleTipoPagoChange = (tipo) => {
        setFormPago(f => ({
            ...f,
            tipo_pago: tipo,
            monto: tipo === 'Total' ? String(modalPago.factura?.monto || '') : '',
        }));
    };

    const validarPago = () => {
        const e = {};
        if (!formPago.monto || Number(formPago.monto) <= 0) e.monto = 'El monto debe ser mayor a 0';
        if (!formPago.medio) e.medio = 'Seleccioná un medio de pago';
        return e;
    };

    const handleConfirmarPago = async () => {
        const e = validarPago();
        setErroresPago(e);
        if (Object.keys(e).length > 0) return;

        setIsPagando(true);
        const factura = modalPago.factura;
        const nuevoEstado = formPago.tipo_pago === 'Total' ? 'Pagada' : 'Pago Parcial';

        try {
            await postFacturaUpdate({
                id:          factura.id,
                nro_factura: factura.id,
                proveedor:   factura.proveedor,
                estado:      nuevoEstado,
                fecha:       formPago.fecha,
                medio_pago:  formPago.medio,
                tipo_pago:   formPago.tipo_pago,
                monto:       Number(formPago.monto),
                comprobante: formPago.comprobante,
            });

            showToast(`Factura ${factura.id} marcada como ${nuevoEstado.toLowerCase()}`, 'success');

            // Optimistic update — actualizar estado de la factura localmente
            setData(prev => ({
                ...prev,
                facturas: {
                    ...prev.facturas,
                    lista: (prev.facturas?.lista || []).map(f =>
                        String(f.id) === String(factura.id)
                            ? { ...f, estado: nuevoEstado }
                            : f
                    ),
                },
            }));

            cerrarModalPago();

            // Sincronizar en background
            refreshData();
        } catch {
            showToast('Error al actualizar la factura. Revisá la conexión con n8n.', 'error');
        } finally {
            setIsPagando(false);
        }
    };

    const handleDescargar = (f) => {
        if (f.drive_link) {
            window.open(f.drive_link, '_blank', 'noopener,noreferrer');
        } else {
            showToast('Esta factura no tiene archivo adjunto en Drive', 'info');
        }
    };

    const handleDescargarPlantilla = () => {
        const blob = new Blob([PLANTILLA_VALE], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_vale.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCargarVale = async (e) => {
        const file = e.target.files?.[0];
        if (!valeInputRef.current) return;
        valeInputRef.current.value = '';
        if (!file) return;
        setSubiendoVale(true);
        try {
            await postFacturaUpload(file);
            showToast('Vale enviado — procesando con IA...', 'success');
        } catch (err) {
            showToast(err.message || 'Error al subir el vale', 'error');
        } finally {
            setSubiendoVale(false);
        }
    };

    // KPI cant: siempre número puro (nunca pesos)
    const cantDocumentos = Number(facturas.kpis?.cant ?? lista.length) || lista.length;

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <KpiCard title="Vencido Urgente" amount={formatPesos(facturas.kpis?.vencida)} color="border-red-500" icon={<AlertCircle className="text-red-500" />} />
                <KpiCard title="A Vencer (7d)" amount={formatPesos(facturas.kpis?.aVencer)} color="border-yellow-500" icon={<AlertTriangle className="text-yellow-500" />} />
                <KpiCard title="Pagado Mes" amount={formatPesos(facturas.kpis?.pagado)} color="border-green-500" icon={<CheckCircle className="text-green-500" />} />
                <KpiCard title="Documentos" amount={cantDocumentos} color="border-blue-500" icon={<FileText className="text-blue-500" />} />
            </div>

            {/* Vales RRHH */}
            <div className="glass-panel px-6 py-4 border border-[var(--color-obsidian-border)] shadow-xl bg-[var(--color-obsidian)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <p className="font-serif font-black text-sm uppercase tracking-widest text-white">Vales RRHH</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Descargá la plantilla, completala y subí el comprobante para registrar automáticamente.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDescargarPlantilla}
                        className="flex items-center gap-1.5 border border-[var(--color-gold)] text-[var(--color-gold)] px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-gold)] hover:text-black transition-all"
                    >
                        <Download size={12} /> Plantilla Vale
                    </button>
                    <input
                        ref={valeInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleCargarVale}
                    />
                    <button
                        onClick={() => valeInputRef.current?.click()}
                        disabled={subiendoVale}
                        className="flex items-center gap-1.5 bg-[var(--color-gold)] text-black px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all disabled:opacity-50"
                    >
                        {subiendoVale ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        {subiendoVale ? 'Enviando...' : 'Cargar Vale'}
                    </button>
                </div>
            </div>

            {/* Tabla con filtros */}
            <div className="glass-panel overflow-hidden shadow-xl w-full border border-[var(--color-obsidian-border)]">
                <div className="px-6 py-5 border-b border-[var(--color-obsidian-border)] flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-[var(--color-obsidian)]">
                    <h3 className="font-serif font-black text-sm lg:text-base uppercase tracking-widest text-white">Archivo Maestro de Facturación</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex gap-1">
                            {ESTADOS.map(e => (
                                <button
                                    key={e}
                                    onClick={() => setFiltroEstado(e)}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-all ${filtroEstado === e ? 'bg-[var(--color-gold)] text-black border-[var(--color-gold)]' : 'border-[var(--color-obsidian-border)] text-gray-400 hover:border-[var(--color-gold)] hover:text-white'}`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                        {onAskAi && (
                            <button
                                onClick={() => onAskAi('Gestión de Caja', '¿Cuáles de estas facturas vencidas debo pagar primero según mi flujo de ventas?')}
                                className="text-black bg-[var(--color-gold)] p-2 hover:bg-[var(--color-gold-hover)] transition-colors flex items-center gap-1 text-[11px] font-bold"
                            >
                                <Sparkles size={14} /> IA Optimizer
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left min-w-[900px] text-sm text-white">
                        <thead className="bg-[#111111] text-[12px] lg:text-sm text-[var(--color-gold)] uppercase tracking-widest font-black border-b border-[var(--color-obsidian-border)]">
                            <tr>
                                <th className="px-6 py-4">ID Factura</th>
                                <th>Proveedor</th>
                                <th>Categoría</th>
                                <th className="cursor-pointer select-none hover:text-white" onClick={() => toggleSort('vencimiento')}>Vencimiento{sortIndicator('vencimiento')}</th>
                                <th className="text-right cursor-pointer select-none hover:text-white" onClick={() => toggleSort('monto')}>Monto{sortIndicator('monto')}</th>
                                <th className="text-center cursor-pointer select-none hover:text-white" onClick={() => toggleSort('estado')}>Estado{sortIndicator('estado')}</th>
                                <th className="text-center px-6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-obsidian-border)]">
                            {filtrada.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-bold text-sm">No hay facturas con ese filtro.</td></tr>
                            ) : filtrada.map((f, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold whitespace-nowrap text-gray-300">{f.id}</td>
                                    <td className="px-6 py-4 font-black">{f.proveedor}</td>
                                    <td className="px-6 py-4"><span className="font-bold border-b border-[var(--color-gold)]">{f.cat}</span></td>
                                    <td className="px-6 py-4 font-black text-gray-400">{f.ven}</td>
                                    <td className="px-6 py-4 text-right font-black">{formatPesos(f.monto)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 border text-[11px] font-black uppercase ${badgeStyle[f.estado] || 'border-gray-500 text-gray-400'}`}>
                                            {f.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {f.estado !== 'Pagada' && (
                                                <button
                                                    onClick={() => abrirModalPago(f)}
                                                    className="flex items-center gap-1 bg-[var(--color-acid)]/10 border border-[var(--color-acid)] text-[var(--color-acid)] px-2.5 py-1 text-[10px] font-black uppercase hover:bg-[var(--color-acid)] hover:text-black transition-all"
                                                >
                                                    <CreditCard size={10} /> Pagar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDescargar(f)}
                                                title={f.drive_link ? 'Descargar desde Drive' : 'Sin archivo adjunto'}
                                                className={`p-2 transition-all ${f.drive_link ? 'text-[var(--color-gold)] hover:scale-110' : 'text-gray-600 cursor-not-allowed'}`}
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal registrar pago de factura */}
            {modalPago.isOpen && modalPago.factura && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-[var(--color-obsidian-light)] border border-[var(--color-obsidian-border)] w-full max-w-sm shadow-2xl">
                        <div className="px-6 py-5 border-b border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 flex justify-between items-center">
                            <div>
                                <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2 text-[var(--color-gold)]">
                                    <CreditCard size={16} /> Registrar Pago
                                </h3>
                                <p className="text-xs font-bold text-gray-400 mt-0.5">
                                    Factura #{modalPago.factura.id} — {modalPago.factura.proveedor} — {formatPesos(modalPago.factura.monto)}
                                </p>
                            </div>
                            <button onClick={cerrarModalPago} className="text-gray-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Tipo de pago */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Tipo de Pago</label>
                                <div className="flex gap-2">
                                    {['Total', 'Parcial'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => handleTipoPagoChange(t)}
                                            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest border transition-all ${
                                                formPago.tipo_pago === t
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
                                    value={formPago.monto}
                                    readOnly={formPago.tipo_pago === 'Total'}
                                    onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))}
                                    className={`w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold outline-none ${formPago.tipo_pago === 'Total' ? 'opacity-60 cursor-not-allowed' : 'focus:border-[var(--color-gold)]'}`}
                                />
                                {erroresPago.monto && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{erroresPago.monto}</p>}
                            </div>
                            {/* Medio de pago */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Medio de Pago</label>
                                <select
                                    value={formPago.medio}
                                    onChange={e => setFormPago(f => ({ ...f, medio: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                >
                                    {MEDIOS_PAGO.map(m => <option key={m}>{m}</option>)}
                                </select>
                                {erroresPago.medio && <p className="text-[var(--color-signal)] text-xs mt-1 font-bold">{erroresPago.medio}</p>}
                            </div>
                            {/* Fecha de pago */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha de Pago</label>
                                <input
                                    type="date"
                                    value={formPago.fecha}
                                    onChange={e => setFormPago(f => ({ ...f, fecha: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none"
                                />
                            </div>
                            {/* Comprobante */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nro. Comprobante <span className="normal-case text-gray-500">(opcional)</span></label>
                                <input
                                    type="text"
                                    placeholder="Ej: TRF-001234"
                                    value={formPago.comprobante}
                                    onChange={e => setFormPago(f => ({ ...f, comprobante: e.target.value }))}
                                    className="w-full bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white px-4 py-2.5 text-sm font-bold focus:border-[var(--color-gold)] outline-none placeholder:text-gray-600"
                                />
                            </div>
                        </div>
                        <div className="p-5 border-t border-[var(--color-obsidian-border)] flex justify-end gap-3">
                            <button
                                onClick={cerrarModalPago}
                                className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest border border-[var(--color-obsidian-border)] text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarPago}
                                disabled={isPagando}
                                className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest bg-[var(--color-acid)] text-black hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isPagando ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><CheckCircle size={14} /> Confirmar Pago</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
