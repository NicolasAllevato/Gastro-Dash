import { useState, useRef, useCallback } from 'react';
import { ShoppingCart, AlertTriangle, Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { KpiCard, ChartBox, TableWrapper, formatPesos } from './SharedComponents';
import { postFacturaUpload } from '../services/api';

const FORMATOS_ACEPTADOS = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const EXTENSIONES = '.pdf,.jpg,.jpeg,.png';

function UploadFactura() {
    const [archivo, setArchivo] = useState(null);
    const [estado, setEstado] = useState('idle'); // idle | uploading | processing | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef(null);

    const validarArchivo = (file) => {
        if (!FORMATOS_ACEPTADOS.includes(file.type)) {
            return 'Formato no válido. Solo PDF, JPG o PNG.';
        }
        if (file.size > 15 * 1024 * 1024) {
            return 'El archivo supera el límite de 15 MB.';
        }
        return null;
    };

    const seleccionarArchivo = (file) => {
        const error = validarArchivo(file);
        if (error) {
            setErrorMsg(error);
            setEstado('error');
            return;
        }
        setArchivo(file);
        setEstado('idle');
        setErrorMsg('');
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) seleccionarArchivo(file);
    }, []);

    const onDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
    const onDragLeave = () => setIsDragOver(false);

    const limpiar = () => {
        setArchivo(null);
        setEstado('idle');
        setErrorMsg('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const subir = async () => {
        if (!archivo) return;
        setEstado('uploading');
        setErrorMsg('');
        try {
            await postFacturaUpload(archivo);
            setEstado('processing');
            setArchivo(null);
            if (inputRef.current) inputRef.current.value = '';
        } catch (err) {
            setEstado('error');
            setErrorMsg(err.message || 'Error al enviar la factura. Intentá de nuevo.');
        }
    };

    const iconoFormato = (tipo) => {
        if (tipo === 'application/pdf') return 'PDF';
        if (tipo.startsWith('image/')) return 'IMG';
        return 'DOC';
    };

    return (
        <div className="glass-panel p-6 border border-[var(--color-obsidian-border)] shadow-xl">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-[var(--color-gold)] mb-4 flex items-center gap-2">
                <Upload size={14} /> Carga de Factura
            </h3>

            {/* Zona drag & drop */}
            {!archivo && estado !== 'processing' && estado !== 'success' && (
                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => inputRef.current?.click()}
                    className={`border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-all duration-200 ${
                        isDragOver
                            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5'
                            : 'border-[var(--color-obsidian-border)] hover:border-[var(--color-gold)]/50 hover:bg-white/3'
                    }`}
                >
                    <Upload size={32} className={`mx-auto mb-3 transition-colors ${isDragOver ? 'text-[var(--color-gold)]' : 'text-gray-600'}`} />
                    <p className="font-black text-sm text-gray-400 uppercase tracking-wide">
                        {isDragOver ? 'Soltá el archivo acá' : 'Arrastrá o hacé click para seleccionar'}
                    </p>
                    <p className="text-xs text-gray-600 font-bold mt-1">PDF · JPG · PNG — Máx. 15 MB</p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={EXTENSIONES}
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) seleccionarArchivo(f); }}
                    />
                </div>
            )}

            {/* Archivo seleccionado */}
            {archivo && estado !== 'processing' && estado !== 'success' && (
                <div className="flex items-center gap-3 p-4 bg-white/5 border border-[var(--color-obsidian-border)]">
                    <div className="w-10 h-10 bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-[var(--color-gold)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-white truncate">{archivo.name}</p>
                        <p className="text-xs text-gray-500 font-bold">
                            {iconoFormato(archivo.type)} · {(archivo.size / 1024).toFixed(0)} KB
                        </p>
                    </div>
                    <button onClick={limpiar} className="text-gray-600 hover:text-white transition-colors p-1 shrink-0">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Estado: procesando */}
            {estado === 'processing' && (
                <div className="flex items-center gap-3 p-5 bg-white/3 border border-[var(--color-obsidian-border)]">
                    <Loader2 size={20} className="animate-spin text-[var(--color-gold)] shrink-0" />
                    <div>
                        <p className="font-black text-sm text-white">Procesando factura...</p>
                        <p className="text-xs text-gray-500 font-bold">El OCR y la extracción pueden tardar 1-2 minutos.</p>
                    </div>
                    <button onClick={limpiar} className="ml-auto text-xs text-gray-600 hover:text-white font-bold transition-colors uppercase tracking-wide">
                        Subir otra
                    </button>
                </div>
            )}

            {/* Estado: error */}
            {estado === 'error' && errorMsg && (
                <div className="flex items-center gap-3 p-4 bg-red-900/10 border border-red-800/40 mt-3">
                    <AlertCircle size={16} className="text-red-400 shrink-0" />
                    <p className="text-sm font-bold text-red-400">{errorMsg}</p>
                    {archivo && (
                        <button onClick={limpiar} className="ml-auto text-gray-600 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Botón subir */}
            {archivo && estado !== 'processing' && estado !== 'success' && (
                <button
                    onClick={subir}
                    disabled={estado === 'uploading'}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--color-gold)] text-black font-black text-xs uppercase tracking-widest py-3 hover:bg-[var(--color-gold-hover)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {estado === 'uploading'
                        ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                        : <><Upload size={14} /> Procesar Factura</>
                    }
                </button>
            )}
        </div>
    );
}

export default function ComprasDashboard({ data }) {
    const compras = data.compras || {};
    const kpis = compras.kpis || {};
    const facturas = compras.facturas || [];

    const cats = ['Todas', ...new Set(facturas.map(f => f.categoria).filter(Boolean))];
    const [filtroCat, setFiltroCat] = useState('Todas');

    const facturasFiltradas = filtroCat === 'Todas'
        ? facturas
        : facturas.filter(f => f.categoria === filtroCat);

    const comprasPorCatPagadas = facturas
        .filter(f => f.estado && f.estado.toLowerCase() === 'pagada')
        .reduce((acc, f) => {
            const cat = f.categoria || 'Sin categoría';
            acc[cat] = (acc[cat] || 0) + f.total;
            return acc;
        }, {});

    const comprasPorCategoriaList = Object.entries(comprasPorCatPagadas)
        .map(([cat, total]) => ({ categoria: cat, total }))
        .sort((a, b) => b.total - a.total);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Upload */}
            <UploadFactura />

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                <KpiCard title="Total Compras" amount={formatPesos(kpis.totales)} color="border-teal-700" icon={<ShoppingCart className="text-teal-700" />} />
                <KpiCard title="% sobre Ventas" amount={kpis.porcentaje != null ? `${kpis.porcentaje}%` : '—'} color="border-pink-700" icon={<ShoppingCart className="text-pink-700" />} />
                <KpiCard title="Promedio Diario" amount={formatPesos(kpis.promedio)} color="border-blue-700" icon={<ShoppingCart className="text-blue-700" />} />
                <KpiCard title="Por Pagar" amount={formatPesos(kpis.porPagar)} color="border-yellow-700" icon={<AlertTriangle className="text-yellow-700" />} />
                <KpiCard title="Total Pagado" amount={formatPesos(kpis.pagado)} color="border-green-700" icon={<ShoppingCart className="text-green-700" />} />
            </div>

            {/* Sección Media */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Columna Izquierda */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* COMPRAS POR CATEGORÍA */}
                    <TableWrapper 
                        title={<span className="flex items-center gap-2"><ShoppingCart size={18} className="text-[var(--color-gold)]" /> Categ. Pagadas</span>}
                    >
                        {comprasPorCategoriaList.length === 0 ? (
                            <p className="px-5 py-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">Sin datos</p>
                        ) : (
                            <div className="divide-y divide-[var(--color-obsidian-border)] max-h-[500px] overflow-y-auto">
                                {comprasPorCategoriaList.map((c, i) => {
                                    const totalPagado = kpis.pagado || 1;
                                    const pct = totalPagado > 0 ? ((c.total / totalPagado) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                                            <span className="font-black text-white text-sm capitalize truncate pr-2">{c.categoria}</span>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className="text-[10px] font-bold text-gray-500">{pct}%</span>
                                                <span className="font-black text-[var(--color-gold)] text-sm">{formatPesos(c.total)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TableWrapper>

                    {/* Tabla deudas (ahora debajo de categorias) */}
                    <TableWrapper title="Top Deudas / Pendientes">
                        <table className="w-full text-sm text-white">
                            <thead className="bg-[#111111] border-b border-[var(--color-obsidian-border)] text-[11px] uppercase tracking-wider font-semibold text-[var(--color-signal)]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Proveedor</th>
                                    <th className="text-right px-4 py-3">Monto Deuda</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {(compras.rankingDeuda || []).length === 0 ? (
                                    <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-500 text-sm font-semibold">Sin deudas registradas.</td></tr>
                                ) : (compras.rankingDeuda || []).map((d, i) => (
                                    <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 text-left text-gray-300 font-semibold">{d.proveedor}</td>
                                        <td className="text-right px-4 py-3 font-semibold text-white">{formatPesos(d.monto)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableWrapper>
                </div>

                {/* Tabla facturas (ahora en la parte media, col-span-2) */}
                <div className="lg:col-span-2">
                    <TableWrapper
                        title="Facturas de Compras"
                        action={
                            <div className="flex gap-1 flex-wrap">
                                {cats.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFiltroCat(c)}
                                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-all ${filtroCat === c ? 'bg-[var(--color-gold)] text-black border-[var(--color-gold)]' : 'border-[var(--color-obsidian-border)] text-gray-400 hover:border-[var(--color-gold)] hover:text-white'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        }
                    >
                        <table className="w-full text-sm text-white">
                            <thead className="bg-[#111111] border-b border-[var(--color-obsidian-border)] text-[11px] uppercase tracking-wider font-semibold text-[var(--color-gold)]">
                                <tr>
                                    <th className="px-4 py-3 text-center">ID Factura</th>
                                    <th className="px-4 py-3 text-center">Categoría</th>
                                    <th className="px-4 py-3 text-center">Proveedor</th>
                                    <th className="px-4 py-3 text-center">Vencimiento</th>
                                    <th className="px-4 py-3 text-center">Total</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {facturasFiltradas.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm font-semibold">No hay facturas con ese filtro.</td></tr>
                                ) : facturasFiltradas.map((f, i) => (
                                    <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 text-center text-gray-200 font-mono font-semibold">{f.id}</td>
                                        <td className="px-4 py-3 text-center text-gray-300 capitalize">{f.categoria}</td>
                                        <td className="px-4 py-3 text-center text-gray-400">{f.proveedor}</td>
                                        <td className="px-4 py-3 text-center text-gray-400">{f.vencimiento}</td>
                                        <td className="px-4 py-3 text-center font-semibold text-white">{formatPesos(f.total)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 border text-[10px] font-black uppercase tracking-widest ${f.estado === 'Pagada' ? 'border-[var(--color-acid)] text-[var(--color-acid)]' : f.estado === 'Vencida' ? 'border-[var(--color-signal)] text-[var(--color-signal)]' : 'border-[var(--color-gold)] text-[var(--color-gold)]'}`}>
                                                {f.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableWrapper>
                </div>
            </div>
        </div>
    );
}
