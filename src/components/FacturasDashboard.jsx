import { useState, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, FileText, Download, Sparkles, Loader2, Upload } from 'lucide-react';
import { KpiCard, TableWrapper, formatPesos } from './SharedComponents';
import { postFacturaUpdate, postFacturaUpload } from '../services/api';
import { useAppContext } from '../AppContext';

const ESTADOS = ['Todas', 'Pendiente', 'Pagada', 'Vencida'];

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

export default function FacturasDashboard({ data, onUpdate, onAskAi }) {
    const { showToast } = useAppContext();
    const [filtroEstado, setFiltroEstado] = useState('Todas');
    const [sortCol, setSortCol] = useState('vencimiento');
    const [sortAsc, setSortAsc] = useState(true);
    const [pagandoId, setPagandoId] = useState(null);
    const [subiendoVale, setSubiendoVale] = useState(false);
    const valeInputRef = useRef(null);

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

    const handlePagar = async (factura) => {
        setPagandoId(factura.id);
        try {
            await postFacturaUpdate({
                id: factura.id,
                estado: 'Pagada',
                fechaPago: new Date().toISOString().split('T')[0],
            });
            showToast(`Factura ${factura.id} marcada como pagada`, 'success');
            onUpdate();
        } catch {
            showToast('Error al actualizar la factura', 'error');
        } finally {
            setPagandoId(null);
        }
    };

    const sortIndicator = (col) => sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : '';

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

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <KpiCard title="Vencido Urgente" amount={formatPesos(facturas.kpis?.vencida)} color="border-red-500" icon={<AlertCircle className="text-red-500" />} />
                <KpiCard title="A Vencer (7d)" amount={formatPesos(facturas.kpis?.aVencer)} color="border-yellow-500" icon={<AlertTriangle className="text-yellow-500" />} />
                <KpiCard title="Pagado Mes" amount={formatPesos(facturas.kpis?.pagado)} color="border-green-500" icon={<CheckCircle className="text-green-500" />} />
                <KpiCard title="Documentos" amount={facturas.kpis?.cant ?? lista.length} color="border-blue-500" icon={<FileText className="text-blue-500" />} />
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
                {/* Header */}
                <div className="px-6 py-5 border-b border-[var(--color-obsidian-border)] flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-[var(--color-obsidian)]">
                    <h3 className="font-serif font-black text-sm lg:text-base uppercase tracking-widest text-white">Archivo Maestro de Facturación</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Filtro estado */}
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

                {/* Tabla */}
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left min-w-[900px] text-base lg:text-xl text-white">
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
                                                    onClick={() => handlePagar(f)}
                                                    disabled={pagandoId === f.id}
                                                    className="flex items-center gap-1 bg-[var(--color-acid)]/10 border border-[var(--color-acid)] text-[var(--color-acid)] px-2.5 py-1 text-[10px] font-black uppercase hover:bg-[var(--color-acid)] hover:text-black transition-all disabled:opacity-50"
                                                >
                                                    {pagandoId === f.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                                                    Pagar
                                                </button>
                                            )}
                                            <button className="p-2 text-[var(--color-gold)] hover:scale-110 transition-all">
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
        </div>
    );
}
