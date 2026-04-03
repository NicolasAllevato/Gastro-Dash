import React, { useState, useMemo } from 'react';
import {
  Package, AlertTriangle, TrendingDown, DollarSign, Search, Filter,
  Download, Upload, Trash2, Edit2, Mail, Save, X, History, CalendarRange
} from 'lucide-react';
import { calculateUsage, calculateCostPerUse, calculateWasteTotal, formatPesos, parseExcelToJSON, exportJSONToExcel } from '../services/stockUtils';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = {
  obsidian: '#0a0a0a', obsidianLight: '#141414', gold: '#d4af37',
  goldHover: '#b5952f', acid: '#00ff88', danger: '#ff3e3e', grey: '#4a4a4a', white: '#ffffff',
  teal: '#0f766e', pink: '#be185d', blue: '#1d4ed8', yellow: '#a16207', red: '#b91c1c'
};
const PIE_COLORS = [COLORS.gold, COLORS.acid, COLORS.danger, COLORS.white, COLORS.grey, COLORS.goldHover];

// Helpers de fecha
const hoy = () => new Date().toISOString().split('T')[0];
const primerDiaMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export default function StockDashboard({ data, onUpdateStock, onAddMovimiento }) {
  const stockData = data?.stock || { kpis: {}, inventario: [], cmvHistorial: [], movimientos: [] };

  // Tab principal
  const [localTab, setLocalTab] = useState('inventario'); // 'inventario' | 'auditoria'

  // Rango de fechas global
  const [fechaDesde, setFechaDesde] = useState(primerDiaMes());
  const [fechaHasta, setFechaHasta] = useState(hoy());

  // Filtros inventario
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  // Búsqueda auditoría
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

  // Inventario local editable
  const [inventory, setInventory] = useState(stockData.inventario);

  // Edición inline
  const [isEditingRow, setIsEditingRow] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isImporting, setIsImporting] = useState(false);

  // Modal Merma
  const [actionModal, setActionModal] = useState({ isOpen: false });
  const [actionFormData, setActionFormData] = useState({ idProducto: '', cantidad: '', motivo: '' });

  // ── Cálculos derivados ──────────────────────────────────────────────────────
  const processedInventory = useMemo(() => inventory.map(item => {
    const uso = calculateUsage(item.stockInicial, item.compras, item.stockFinal);
    const costoPorUso = calculateCostPerUse(uso, item.precioUnitario);
    const totalMerma = calculateWasteTotal(item.merma, item.precioUnitario);
    const hasWarning = item.stockFinal <= item.stockInicial * 0.2;
    const isCritical = item.stockFinal <= 0;
    return { ...item, uso, costoPorUso, totalMerma, hasWarning, isCritical };
  }), [inventory]);

  const filteredInventory = processedInventory.filter(item => {
    const matchesSearch = (item.producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.proveedor || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || item.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = ['Todas', ...new Set(inventory.map(item => item.categoria))];

  const currentTotalValue = processedInventory.reduce((acc, item) => acc + (item.stockFinal * item.precioUnitario), 0);
  const currentTotalWaste = processedInventory.reduce((acc, item) => acc + item.totalMerma, 0);
  const criticalItemsCount = processedInventory.filter(item => item.isCritical).length;

  // Filtrar movimientos por rango de fechas (auditoría)
  const movimientosFiltrados = useMemo(() => {
    return stockData.movimientos.filter(m => {
      const textoMatch = (m.producto || '').toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
        (m.tipo || '').toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
        (m.motivo || '').toLowerCase().includes(auditSearchTerm.toLowerCase());
      if (!textoMatch) return false;
      if (!fechaDesde && !fechaHasta) return true;
      // Intentamos parsear la fecha del movimiento
      const fechaMov = m.fecha ? m.fecha.split(' ')[0] : null;
      if (!fechaMov) return true;
      const [d, mo, y] = fechaMov.includes('/') ? fechaMov.split('/') : [null, null, null];
      const isoFecha = y ? `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}` : fechaMov;
      if (fechaDesde && isoFecha < fechaDesde) return false;
      if (fechaHasta && isoFecha > fechaHasta) return false;
      return true;
    });
  }, [stockData.movimientos, auditSearchTerm, fechaDesde, fechaHasta]);

  // Filtrar CMV histórico por rango de fechas
  const cmvFiltrado = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return stockData.cmvHistorial;
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta) : null;
    return stockData.cmvHistorial.filter(item => {
      if (!item.mes) return true;
      // item.mes puede ser "Ene", "Feb", etc. — si no es parseable devolvemos todo
      return true; // fallback: mostrar siempre si no hay fecha ISO en el dato
    });
  }, [stockData.cmvHistorial, fechaDesde, fechaHasta]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEditClick = (item) => { setIsEditingRow(item.id); setEditFormData(item); };

  const handleSaveEdit = () => {
    setInventory(prev => prev.map(item => item.id === editFormData.id ? { ...item, ...editFormData } : item));
    const modItem = inventory.find(i => i.id === editFormData.id);
    if (onAddMovimiento && modItem) {
      onAddMovimiento({
        fecha: new Date().toLocaleString(),
        responsable: 'Admin (Manual)',
        tipo: 'Ajuste Manual',
        producto: modItem.producto,
        cantidad: 0,
        motivo: 'Modificación manual en grilla'
      });
    }
    setIsEditingRow(null);
  };

  const handleChangeEditForm = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: isNaN(value) || value === '' ? value : Number(value) }));
  };

  const handleActionFormSubmit = (e) => {
    e.preventDefault();
    const pid = Number(actionFormData.idProducto);
    const cant = Number(actionFormData.cantidad);
    const targetItem = inventory.find(i => i.id === pid);
    if (!targetItem || cant <= 0) return alert('Seleccione un producto y cantidad válida mayor a cero.');
    setInventory(prev => prev.map(item =>
      item.id === pid ? { ...item, merma: item.merma + cant } : item
    ));
    if (onAddMovimiento) {
      onAddMovimiento({
        fecha: new Date().toLocaleString(),
        responsable: 'Admin',
        tipo: 'Registro Merma',
        producto: targetItem.producto,
        cantidad: -cant,
        motivo: actionFormData.motivo || 'N/A'
      });
    }
    setActionModal({ isOpen: false });
    setActionFormData({ idProducto: '', cantidad: '', motivo: '' });
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const jsonData = await parseExcelToJSON(file);
      if (jsonData.length > 0 && typeof jsonData[0]?.producto !== 'undefined' && typeof jsonData[0]?.stockInicial !== 'undefined') {
        const mappedData = jsonData.map((row, index) => ({
          id: Date.now() + index,
          categoria: row.categoria || 'Sin Categoría',
          producto: row.producto || 'Producto Desconocido',
          unidad: row.unidad || 'Unidad',
          stockInicial: Number(row.stockInicial) || 0,
          compras: Number(row.compras) || 0,
          stockFinal: Number(row.stockFinal) || 0,
          merma: Number(row.merma) || 0,
          precioUnitario: Number(row.precioUnitario) || 0,
          proveedor: row.proveedor || 'N/A'
        }));
        setInventory(mappedData);
        if (onAddMovimiento) {
          onAddMovimiento({
            fecha: new Date().toLocaleString(), responsable: 'Admin',
            tipo: 'Importación Masiva', producto: 'Múltiples',
            cantidad: mappedData.length, motivo: 'Carga inicial/masiva XLSX'
          });
        }
        alert(`Importación exitosa. Se cargaron ${mappedData.length} filas.`);
      } else {
        alert('ERROR DE FORMATO:\nEl archivo debe contener al menos las columnas "producto" y "stockInicial".');
      }
    } catch (err) {
      alert(err);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    const exportData = processedInventory.map(item => ({
      Categoría: item.categoria, Producto: item.producto, Unidad: item.unidad,
      'Stock Inicial': item.stockInicial, Compras: item.compras, 'Stock Final': item.stockFinal,
      Uso: item.uso, 'Precio Unitario': item.precioUnitario,
      'Costo Uso': item.costoPorUso, Merma: item.merma, 'Total Merma': item.totalMerma,
      Proveedor: item.proveedor
    }));
    exportJSONToExcel(exportData, `GastroDash_Stock_${fechaDesde}_a_${fechaHasta}.xlsx`);
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent('Reporte de Stock Crítico - Gastro Dash');
    const urgentItems = processedInventory.filter(item => item.isCritical)
      .map(item => `- ${item.producto}: ${item.stockFinal} ${item.unidad}`).join('%0A');
    const body = encodeURIComponent(
      `Reporte de Stock\nPeríodo: ${fechaDesde} al ${fechaHasta}\n\n` +
      `Valor Stock: ${formatPesos(currentTotalValue)}\n` +
      `Total Mermas: ${formatPesos(currentTotalWaste)}\n\n` +
      `Ítems críticos (sin stock):\n${urgentItems || 'Ninguno'}\n\n` +
      `*Adjunte el reporte Excel exportado previamente.*\n\nGastro Dash`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-[var(--color-obsidian-border)] pb-5">

        {/* Título */}
        <div className="shrink-0">
          <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-widest text-white flex items-center gap-3">
            <Package className="text-[var(--color-gold)]" size={28} /> Control de Inventario
          </h2>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">Auditoría · Mermas · Costos</p>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Sub-tabs */}
          <div className="bg-[#111111] p-1 border border-[var(--color-obsidian-border)] flex items-center gap-0.5">
            <button
              onClick={() => setLocalTab('inventario')}
              className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 ${localTab === 'inventario' ? 'bg-[var(--color-gold)] text-black' : 'text-gray-500 hover:text-white'}`}
            >
              <Package size={13} /> Dashboard
            </button>
            <button
              onClick={() => setLocalTab('auditoria')}
              className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 ${localTab === 'auditoria' ? 'bg-[var(--color-gold)] text-black' : 'text-gray-500 hover:text-white'}`}
            >
              <History size={13} /> Auditoría
            </button>
          </div>

          {/* Rango de fechas */}
          <div className="flex items-center gap-2 bg-[#111] border border-[var(--color-obsidian-border)] px-3 py-1.5">
            <CalendarRange size={14} className="text-[var(--color-gold)] shrink-0" />
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="bg-transparent text-white text-[11px] font-bold outline-none w-[120px] cursor-pointer"
            />
            <span className="text-gray-600 text-xs font-black">→</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="bg-transparent text-white text-[11px] font-bold outline-none w-[120px] cursor-pointer"
            />
          </div>

          {/* Importar */}
          <input type="file" id="excel-upload" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} disabled={isImporting} />
          <label
            htmlFor="excel-upload"
            className="bg-[#111] hover:bg-white/10 text-white border border-[var(--color-obsidian-border)] px-4 py-2.5 text-[11px] font-black flex items-center gap-2 transition-all uppercase tracking-widest cursor-pointer group"
          >
            {isImporting
              ? <span className="animate-spin border-2 border-t-transparent border-[var(--color-gold)] rounded-full w-4 h-4" />
              : <Upload size={15} className="text-[var(--color-gold)] group-hover:-translate-y-0.5 transition-transform" />}
            {isImporting ? 'Cargando...' : 'Importar'}
          </label>

          {/* Email */}
          <button
            onClick={handleSendEmail}
            className="bg-[#111] hover:bg-white/10 text-white border border-[var(--color-obsidian-border)] px-4 py-2.5 text-[11px] font-black flex items-center gap-2 transition-all uppercase tracking-widest group"
          >
            <Mail size={15} className="text-blue-400 group-hover:scale-110 transition-transform" /> E-Mail
          </button>
        </div>
      </div>

      {/* ── DASHBOARD TAB ──────────────────────────────────────────────────── */}
      {localTab === 'inventario' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: 'Valor Stock', value: formatPesos(currentTotalValue), icon: <Package size={22} color={COLORS.acid} />, border: 'border-teal-700' },
              { label: 'Mermas (Total)', value: formatPesos(currentTotalWaste), icon: <TrendingDown size={22} color={COLORS.danger} />, border: 'border-pink-700' },
              { label: 'Alertas Críticas', value: `${criticalItemsCount} Ítems`, icon: <AlertTriangle size={22} color={COLORS.danger} />, border: 'border-amber-700' },
              { label: 'CMV Mensual', value: formatPesos(stockData.kpis.cmvMensual), icon: <DollarSign size={22} color={COLORS.gold} />, border: 'border-blue-700' },
            ].map(({ label, value, icon, border }) => (
              <div key={label} className={`glass-panel p-5 lg:p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group ${border}`}>
                <div className="p-3 bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] shadow-xl rounded-full mb-3">{icon}</div>
                <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.15em] text-gray-400 font-bold mb-1">{label}</p>
                <h4 className="text-xl sm:text-2xl lg:text-[1.6rem] font-black text-white">{value}</h4>
              </div>
            ))}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6 shadow-xl h-[350px]">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[var(--color-obsidian-border)] pb-3">
                <DollarSign size={16} className="text-[var(--color-gold)]" /> CMV Histórico
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cmvFiltrado}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-obsidian-border)" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#a0a0a0' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a0a0a0', fontWeight: '700' }} tickFormatter={v => `$${v / 1000}k`} />
                  <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', color: '#fff' }} />
                  <Bar dataKey="cmv" fill={COLORS.gold} radius={[2, 2, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-panel p-6 shadow-xl h-[350px] flex flex-col">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-[var(--color-obsidian-border)] pb-3">
                <Package size={16} className="text-[var(--color-acid)]" /> Valor por Categoría
              </h3>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={uniqueCategories.filter(c => c !== 'Todas').map(cat => ({
                        name: cat,
                        value: processedInventory.filter(i => i.categoria === cat).reduce((a, it) => a + it.stockFinal * it.precioUnitario, 0)
                      }))}
                      innerRadius={70} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none"
                    >
                      {uniqueCategories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={v => formatPesos(v)} contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#a0a0a0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabla de inventario */}
          <div className="glass-panel overflow-hidden shadow-xl border border-[var(--color-obsidian-border)]">
            {/* Controles tabla */}
            <div className="p-4 bg-[var(--color-obsidian)] border-b border-[var(--color-obsidian-border)] flex flex-col lg:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar producto o proveedor..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-[#111] border border-[var(--color-obsidian-border)] text-white text-sm focus:border-[var(--color-gold)] pl-9 pr-4 py-2 transition-colors font-bold placeholder:font-normal placeholder:text-[11px] placeholder:uppercase placeholder:tracking-widest outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="text-gray-500" size={16} />
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="bg-[#111] border border-[var(--color-obsidian-border)] text-white text-[11px] font-black uppercase tracking-widest focus:border-[var(--color-gold)] px-3 py-2 appearance-none cursor-pointer outline-none"
                  >
                    {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              {/* Acciones de la tabla */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="bg-[#111] hover:bg-white/10 text-white border border-[var(--color-obsidian-border)] px-3 py-2 text-[11px] font-black flex items-center gap-1.5 transition-all uppercase tracking-widest"
                >
                  <Download size={14} className="text-[var(--color-acid)]" /> Exportar
                </button>
                <button
                  onClick={() => setActionModal({ isOpen: true })}
                  className="border border-[var(--color-signal)] text-[var(--color-signal)] hover:bg-[var(--color-signal)] hover:text-white px-3 py-2 text-[11px] font-black flex items-center gap-1.5 transition-all uppercase tracking-widest"
                >
                  <TrendingDown size={14} /> Merma
                </button>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[1400px] text-sm text-white">
                <thead className="bg-[#111111] text-[10px] lg:text-[11px] text-[var(--color-gold)] uppercase tracking-widest font-black border-b border-[var(--color-obsidian-border)]">
                  <tr>
                    <th className="px-5 py-4 w-12 text-center">Aud.</th>
                    <th className="px-4 py-4">Categoría</th>
                    <th className="px-4 py-4">Producto</th>
                    <th className="px-4 py-4 text-center">Unidad</th>
                    <th className="px-4 py-4 text-center">S.Inicial</th>
                    <th className="px-4 py-4 text-center text-[var(--color-acid)]">Compras(+)</th>
                    <th className="px-4 py-4 text-center text-white bg-white/5 border-l border-r border-[#333]">S.Final(=)</th>
                    <th className="px-4 py-4 text-center text-gray-400 bg-gray-900">Uso(Fórmula)</th>
                    <th className="px-4 py-4 text-right">Precio Unit.</th>
                    <th className="px-4 py-4 text-right font-black">Costo Uso</th>
                    <th className="px-4 py-4 text-center text-[var(--color-signal)]">Merma(-)</th>
                    <th className="px-4 py-4 text-right">Total Merma</th>
                    <th className="px-4 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-obsidian-border)] text-[13px]">
                  {filteredInventory.map(item => {
                    const isEditing = isEditingRow === item.id;
                    return (
                      <tr key={item.id} className={`hover:bg-white/5 transition-colors group ${item.isCritical ? 'bg-[var(--color-signal)]/10' : ''}`}>
                        <td className="px-5 py-4 text-center">
                          {item.isCritical && <AlertTriangle size={16} className="text-[var(--color-signal)] inline animate-pulse" />}
                          {!item.isCritical && item.hasWarning && <AlertTriangle size={16} className="text-[var(--color-gold)] inline" />}
                        </td>
                        <td className="px-4 py-4 font-bold text-gray-400">{item.categoria}</td>
                        <td className="px-4 py-4 font-black text-white whitespace-nowrap">{item.producto}</td>
                        <td className="px-4 py-4 text-center font-bold">
                          {isEditing ? <input name="unidad" value={editFormData.unidad} onChange={handleChangeEditForm} className="w-full bg-black border border-gray-600 px-2 py-1 text-center outline-none" /> : item.unidad}
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-gray-300">
                          {isEditing ? <input name="stockInicial" type="number" value={editFormData.stockInicial} onChange={handleChangeEditForm} className="w-16 bg-black border border-gray-600 px-2 py-1 text-center outline-none" /> : item.stockInicial}
                        </td>
                        <td className="px-4 py-4 text-center font-black text-[var(--color-acid)]">
                          {isEditing ? <input name="compras" type="number" value={editFormData.compras} onChange={handleChangeEditForm} className="w-16 bg-black border border-teal-600 px-2 py-1 text-center outline-none" /> : `+${item.compras}`}
                        </td>
                        <td className="px-4 py-4 text-center font-black text-white bg-white/5 border-l border-r border-[#333]">
                          {isEditing ? <input name="stockFinal" type="number" value={editFormData.stockFinal} onChange={handleChangeEditForm} className="w-16 bg-black border border-[var(--color-gold)] px-2 py-1 text-center outline-none" /> : item.stockFinal}
                        </td>
                        <td className="px-4 py-4 text-center font-black bg-gray-900 border-x border-[#222]">{item.uso}</td>
                        <td className="px-4 py-4 text-right font-bold text-gray-300">
                          {isEditing ? <input name="precioUnitario" type="number" value={editFormData.precioUnitario} onChange={handleChangeEditForm} className="w-24 bg-black border border-gray-600 px-2 py-1 text-right outline-none" /> : formatPesos(item.precioUnitario)}
                        </td>
                        <td className="px-4 py-4 text-right font-black bg-black/50">{formatPesos(item.costoPorUso)}</td>
                        <td className="px-4 py-4 text-center font-black text-[var(--color-signal)]">
                          {isEditing ? <input name="merma" type="number" value={editFormData.merma} onChange={handleChangeEditForm} className="w-16 bg-black border border-[var(--color-signal)] px-2 py-1 text-center text-[var(--color-signal)] outline-none" /> : (item.merma > 0 ? `-${item.merma}` : 0)}
                        </td>
                        <td className="px-4 py-4 text-right font-black opacity-80">
                          {item.totalMerma > 0 ? formatPesos(item.totalMerma) : '—'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-2">
                              <button onClick={handleSaveEdit} className="p-1.5 bg-green-900/40 text-green-400 hover:bg-green-600 hover:text-white"><Save size={15} /></button>
                              <button onClick={() => setIsEditingRow(null)} className="p-1.5 bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white"><X size={15} /></button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditClick(item)} className="p-1.5 text-gray-400 hover:text-[var(--color-gold)] transition-colors"><Edit2 size={15} /></button>
                              <button className="p-1.5 text-gray-400 hover:text-[var(--color-signal)] transition-colors"><Trash2 size={15} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan="13" className="px-6 py-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                        Sin datos. Importá un archivo XLSX para comenzar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── AUDITORÍA TAB ──────────────────────────────────────────────────── */}
      {localTab === 'auditoria' && (
        <div className="glass-panel overflow-hidden shadow-xl border border-[var(--color-obsidian-border)]">
          <div className="p-4 bg-[var(--color-obsidian)] border-b border-[var(--color-obsidian-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <h3 className="text-base font-black text-[var(--color-gold)] tracking-widest uppercase flex items-center gap-2">
              <History size={18} /> Historial de Movimientos
              <span className="text-gray-500 text-xs font-bold normal-case">
                {fechaDesde} → {fechaHasta}
              </span>
            </h3>
            <div className="flex items-center gap-2 relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
              <input
                type="text"
                placeholder="Buscar producto, tipo, motivo..."
                value={auditSearchTerm}
                onChange={e => setAuditSearchTerm(e.target.value)}
                className="w-full bg-[#111] border border-[var(--color-obsidian-border)] text-white text-xs pl-9 pr-3 py-2 focus:border-[var(--color-gold)] outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[900px] text-sm text-white">
              <thead className="bg-[#050505] text-[10px] text-gray-400 uppercase tracking-widest font-black border-b border-[var(--color-obsidian-border)]">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-4 py-4">Fecha</th>
                  <th className="px-4 py-4">Responsable</th>
                  <th className="px-4 py-4">Tipo</th>
                  <th className="px-4 py-4">Producto</th>
                  <th className="px-4 py-4 text-center">Cant.</th>
                  <th className="px-4 py-4">Motivo / Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-obsidian-border)] text-[12px] font-mono font-bold">
                {movimientosFiltrados.map((m, i) => (
                  <tr key={m.id || i} className="hover:bg-white/5">
                    <td className="px-5 py-3 text-gray-500">#{m.id}</td>
                    <td className="px-4 py-3 font-sans text-[var(--color-gold)]">{m.fecha}</td>
                    <td className="px-4 py-3">{m.responsable}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 border text-[9px] uppercase tracking-wider ${m.tipo?.includes('Compra') ? 'border-[var(--color-acid)] text-[var(--color-acid)]' : m.tipo?.includes('Merma') ? 'border-[var(--color-signal)] text-[var(--color-signal)]' : 'border-gray-600 text-gray-400'}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans text-white font-black">{m.producto}</td>
                    <td className="px-4 py-3 text-center">{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                    <td className="px-4 py-3 font-sans opacity-80">{m.motivo}</td>
                  </tr>
                ))}
                {movimientosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500 font-sans tracking-widest uppercase text-xs">
                      No hay registros en el período seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL MERMA ───────────────────────────────────────────────────── */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[var(--color-obsidian-border)] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--color-signal)] bg-[var(--color-signal)]/10 flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-lg flex items-center gap-2 text-[var(--color-signal)]">
                <TrendingDown size={20} /> Registrar Merma / Pérdida
              </h3>
              <button onClick={() => setActionModal({ isOpen: false })} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleActionFormSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Producto</label>
                <select
                  required value={actionFormData.idProducto}
                  onChange={e => setActionFormData(p => ({ ...p, idProducto: e.target.value }))}
                  className="w-full bg-[#050505] border border-[var(--color-obsidian-border)] text-white p-3 text-sm focus:border-[var(--color-gold)] outline-none font-bold"
                >
                  <option value="">— Seleccionar producto —</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.producto} ({item.unidad}) — Stock: {item.stockFinal}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Cantidad (−)</label>
                <input
                  required type="number" min="0.1" step="0.1" placeholder="Ej: 2"
                  value={actionFormData.cantidad}
                  onChange={e => setActionFormData(p => ({ ...p, cantidad: e.target.value }))}
                  className="w-full bg-[#050505] border border-[var(--color-obsidian-border)] text-white p-3 text-sm focus:border-[var(--color-gold)] outline-none font-black text-center"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Motivo</label>
                <textarea
                  required rows="2" placeholder="Ej: Vencimiento, rotura, accidente..."
                  value={actionFormData.motivo}
                  onChange={e => setActionFormData(p => ({ ...p, motivo: e.target.value }))}
                  className="w-full bg-[#050505] border border-[var(--color-obsidian-border)] text-gray-300 p-3 text-sm focus:border-[var(--color-gold)] outline-none font-medium resize-none"
                />
              </div>
              <div className="pt-4 border-t border-[var(--color-obsidian-border)] flex justify-end gap-3">
                <button type="button" onClick={() => setActionModal({ isOpen: false })} className="px-6 py-2.5 border border-gray-600 text-gray-400 text-xs font-black uppercase tracking-widest hover:text-white">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-[var(--color-signal)] text-white text-xs font-black uppercase tracking-widest hover:-translate-y-0.5 transition-transform">
                  Confirmar Merma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
