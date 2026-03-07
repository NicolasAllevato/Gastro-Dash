import React, { useState, useEffect } from 'react';
import { fetchBusinessData, callGeminiWithContext } from './services/api';
import GeminiChat from './components/GeminiChat';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  LayoutDashboard, ShoppingCart, DollarSign, Users, FileText,
  CreditCard, TrendingDown, TrendingUp, Calendar, Filter, Menu, X,
  Percent, AlertCircle, CheckCircle, AlertTriangle, Briefcase, Package, Flame,
  Landmark, Wallet, Eye, ChevronRight, Download, Sparkles, Loader2, ChevronLeft
} from 'lucide-react';

// --- CONFIGURACIÓN DE COLORES OBSIDIAN GOLD ---
const COLORS = {
  obsidian: '#0a0a0a',
  obsidianLight: '#141414',
  gold: '#d4af37',
  goldHover: '#b5952f',
  acid: '#00ff88',
  danger: '#ff3e3e',
  grey: '#4a4a4a',
  white: '#ffffff'
};

const PIE_COLORS = [COLORS.gold, COLORS.acid, COLORS.danger, COLORS.white, COLORS.grey, COLORS.goldHover];

// --- DATOS SIMULADOS INICIALES (Como fallback/skeleton) ---
const initialData = {
  resumen: { kpis: [], tendencia: [] },
  ventas: { acumuladas: 0, porTurno: [], porMedioPago: [], porDia: [] },
  compras: { kpis: {}, porCategoria: [], tendencia: [], rankingDeuda: [], facturas: [] },
  rrhh: { kpis: {}, porArea: [], empleados: [] },
  costos: { kpis: { mayorAumento: { variacion: 0 }, mayorGasto: { monto: 0 } }, topInsumos: [], evolucion: [], productos: [] },
  pagos: { kpis: { cat: {} }, porMedio: [], salidaDia: [], lista: [] },
  facturas: { kpis: {}, lista: [] }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [modalVenta, setModalVenta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");

  const [data, setData] = useState(initialData);

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedData = await fetchBusinessData();
        // n8n returns an array or an object depending on webhook. Assuming object matches state.
        setData(fetchedData?.resumen ? fetchedData : fetchedData[0]);
      } catch (error) {
        console.error("No se pudieron cargar datos desde n8n. Mostrando skeleton.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const formatPesos = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '$ 0';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'ventas', label: 'Ventas', icon: TrendingUp },
    { id: 'compras', label: 'Compras', icon: ShoppingCart },
    { id: 'rrhh', label: 'RRHH', icon: Users },
    { id: 'costos', label: 'Control Costos', icon: TrendingDown },
    { id: 'pagos', label: 'Control Pagos', icon: CreditCard },
    { id: 'facturas', label: 'Facturas', icon: FileText },
  ];

  const handleAskAi = async (topic, prompt) => {
    setAiTopic(topic);
    setIsAiModalOpen(true);
    setAiResponse("");
    setIsAiLoading(true);
    const sys = "Eres consultor gastronómico experto. Analiza datos y da sugerencias breves, directas y profesionales en español latino.";
    try {
      const result = await callGeminiWithContext(`Estado del negocio: ${JSON.stringify(data)}\n\nConsulta: ${prompt}`, sys);
      setAiResponse(result);
    } catch (err) {
      setAiResponse("Hubo un problema de conexión con el asistente estratégico.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#1a1c23] text-white">
      <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-black italic tracking-widest uppercase">GASTRO DASH</h2>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--color-obsidian)] font-sans overflow-hidden text-white relative">

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR (Floating/Drawer on Mobile, Collapsible on PC) */}
      <aside className={`fixed lg:relative top-0 bottom-0 left-0 bg-[var(--color-obsidian-light)] text-white flex flex-col transition-transform duration-300 ease-in-out z-50 border-r border-[var(--color-obsidian-border)] ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}>
        <div className="p-6 border-b border-[var(--color-obsidian-border)] flex justify-between items-center h-[72px] shrink-0">
          <span className={`text-2xl font-black text-[var(--color-gold)] tracking-widest uppercase transition-opacity duration-200 ${!isSidebarOpen ? 'lg:opacity-0 hidden lg:block' : ''}`}>
            GASTRO
          </span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-[var(--color-gold)] transition-colors"><X size={24} /></button>
        </div>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto overflow-x-hidden">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-none border-l-2 transition-all group ${activeTab === item.id
                ? 'bg-white/5 border-[var(--color-gold)] text-[var(--color-gold)]'
                : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <item.icon size={18} className={`shrink-0 ${activeTab === item.id ? 'animate-pulse text-[var(--color-gold)]' : 'group-hover:text-[var(--color-gold)]'}`} />
              <span className={`font-bold text-sm tracking-wide transition-opacity duration-200 uppercase whitespace-nowrap ${!isSidebarOpen ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* HEADER CON TOGGLE PC/MOBILE */}
        <header className="bg-[var(--color-obsidian)] border-b border-[var(--color-obsidian-border)] px-6 h-[72px] flex items-center justify-between z-30">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/5 hover:bg-white/10 rounded-sm transition-colors text-[var(--color-gold)] border border-transparent hover:border-[var(--color-gold)]">
              {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg lg:text-xl font-black uppercase tracking-widest text-white truncate w-32 sm:w-auto">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => handleAskAi("Planificación Estratégica", "Basado en los datos de hoy, ¿qué decisiones debo tomar para mejorar la rentabilidad?")} className="bg-[var(--color-gold)] text-black px-5 py-2.5 rounded-sm text-xs font-black flex items-center space-x-2 hover:bg-[var(--color-gold-hover)] transition-all shadow-lg uppercase tracking-widest card-hover-fx">
              <Sparkles size={14} className="text-black" />
              <span className="hidden sm:inline">IA Strategy</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 bg-[var(--color-obsidian-light)]">

          {/* VISTA RESUMEN */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Ventas Totales" amount={formatPesos(1542000)} subtitle="+12.5% vs mes anterior" color="border-teal-700" icon={<TrendingUp className="text-teal-700" />} />
                <KpiCard title="Compras Totales" amount={formatPesos(830000)} subtitle="Gasto en insumos" color="border-pink-700" icon={<ShoppingCart className="text-pink-700" />} />
                <KpiCard title="Costo RRHH" amount={formatPesos(3200000)} subtitle="Sueldos y vales" color="border-blue-700" icon={<Users className="text-blue-700" />} />
                <KpiCard title="Deuda Proveedores" amount={formatPesos(450000)} subtitle="Facturas vencidas" color="border-red-700" icon={<AlertCircle className="text-red-700" />} />
              </div>
              <ChartBox title="Evolución de Ingresos" data={data.resumen.tendencia} type="area" />
            </div>
          )}

          {/* VISTA VENTAS */}
          {activeTab === 'ventas' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Ventas Acumuladas" amount={formatPesos(data.ventas.acumuladas)} color="border-teal-700" icon={<TrendingUp className="text-teal-700" />} />
                <KpiCard title="Promedio Diario" amount={formatPesos(65000)} color="border-pink-700" icon={<DollarSign className="text-pink-700" />} />
                <KpiCard title="Mejor Turno" amount="Noche" color="border-blue-700" icon={<Calendar className="text-blue-700" />} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartBox title="Ventas por Turno" data={data.ventas.porTurno} type="bar" color={COLORS.teal} />
                <ChartBox title="Medios de Pago" data={data.ventas.porMedioPago} type="pie" />
              </div>
              <TableWrapper title="Carga Diaria de Ventas" subtitle="Toca una fila para ver el detalle de cobro">
                <table className="w-full text-base lg:text-xl text-white">
                  <thead className="bg-[#111111] border-b border-[var(--color-obsidian-border)] text-[12px] lg:text-sm uppercase font-black text-[var(--color-gold)]">
                    <tr><th className="px-6 py-4">Fecha</th><th>Mañana</th><th>Tarde</th><th>Noche</th><th className="text-right px-6">Total</th></tr>
                  </thead>
                  <tbody>
                    {data.ventas.porDia.map((d, i) => (
                      <tr key={i} onClick={() => setModalVenta(d)} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 cursor-pointer transition-colors">
                        <td className="px-6 py-4 font-bold">{d.fecha}</td>
                        <td className="font-bold">{formatPesos(d.turnos.manana)}</td>
                        <td className="font-bold">{formatPesos(d.turnos.tarde)}</td>
                        <td className="font-bold">{formatPesos(d.turnos.noche)}</td>
                        <td className="px-6 py-4 text-right font-black">{formatPesos(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            </div>
          )}

          {/* VISTA COMPRAS (CON TABLA DE FACTURAS) */}
          {activeTab === 'compras' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                <KpiCard title="Total Compras" amount={formatPesos(data.compras.kpis.totales)} color="border-teal-700" />
                <KpiCard title="Porcentaje compras" amount={`${data.compras.kpis.porcentaje}%`} color="border-pink-700" />
                <KpiCard title="Promedio Diario" amount={formatPesos(data.compras.kpis.promedio)} color="border-blue-700" />
                <KpiCard title="Por Pagar" amount={formatPesos(data.compras.kpis.porPagar)} color="border-yellow-700" />
                <KpiCard title="Total Pagado" amount={formatPesos(data.compras.kpis.pagado)} color="border-green-700" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartBox title="Distribución Insumos" data={data.compras.porCategoria} type="pie" />
                <ChartBox title="Evolución Semanal" data={data.compras.tendencia} type="line" color={COLORS.pink} />
                <div className="glass-panel p-6 shadow-xl flex flex-col justify-center border-l-4 border-[var(--color-signal)]">
                  <h3 className="font-bold text-[var(--color-signal)] mb-4 flex items-center gap-2 uppercase text-[10px] tracking-widest"><AlertTriangle size={16} /> Top Deudas</h3>
                  {data.compras.rankingDeuda.map((d, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-[var(--color-obsidian-border)] last:border-0 font-bold text-sm">
                      <span className="text-gray-400 truncate mr-2">{d.proveedor}</span>
                      <span className="text-white">{formatPesos(d.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* TABLA DE COMPRAS RECUPERADA */}
              <TableWrapper title="Facturas de Compras Recientes">
                <table className="w-full text-base lg:text-xl text-left text-white">
                  <thead className="bg-[#111111] border-b border-[var(--color-obsidian-border)] text-[12px] lg:text-sm uppercase font-black text-[var(--color-gold)]">
                    <tr><th className="px-6 py-4">ID Factura</th><th>Categoría</th><th>Proveedor</th><th className="text-right">Total</th><th className="text-center px-6">Estado</th></tr>
                  </thead>
                  <tbody>
                    {data.compras.facturas.map((f, i) => (
                      <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold">{f.id}</td>
                        <td className="font-bold">{f.categoria}</td>
                        <td className="font-black text-black">{f.proveedor}</td>
                        <td className="text-right font-black">{formatPesos(f.total)}</td>
                        <td className="text-center px-6">
                          <span className={`px-2 py-0.5 rounded-none border border-black text-[10px] font-black uppercase text-black`}>{f.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            </div>
          )}

          {/* VISTA RRHH */}
          {activeTab === 'rrhh' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                <KpiCard title="Sueldos a Pagar" amount={formatPesos(data.rrhh.kpis.sueldosAPagar)} color="border-yellow-700" />
                <KpiCard title="Sueldos Pagados" amount={formatPesos(data.rrhh.kpis.sueldosPagados)} color="border-green-700" />
                <KpiCard title="Total Vales" amount={formatPesos(data.rrhh.kpis.totalVales)} color="border-pink-700" />
                <KpiCard title="Personal Activo" amount={data.rrhh.kpis.empleadosActivos} color="border-blue-700" />
                <KpiCard title="Costo RRHH %" amount={`${data.rrhh.kpis.costoRRHH}%`} color="border-teal-700" />
              </div>
              <TableWrapper title="Liquidación Detallada">
                <table className="w-full text-base lg:text-xl text-left text-white">
                  <thead className="bg-[#111111] text-[12px] lg:text-sm font-black uppercase text-[var(--color-gold)] border-b border-[var(--color-obsidian-border)]">
                    <tr><th className="px-6 py-4">Nombre</th><th>Puesto</th><th className="text-right">Base</th><th className="text-right">Vales</th><th className="text-right px-6 bg-[var(--color-obsidian)] text-[var(--color-acid)]">Saldo Neto</th></tr>
                  </thead>
                  <tbody>
                    {data.rrhh.empleados.map((e, i) => (
                      <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-black text-white">{e.nombre}</td>
                        <td><span className="font-bold underline decoration-2 text-gray-400">{e.puesto}</span></td>
                        <td className="text-right font-bold text-gray-300">{formatPesos(e.sueldo)}</td>
                        <td className="text-right font-black text-[var(--color-signal)]">{formatPesos(e.vales)}</td>
                        <td className="text-right px-6 font-black bg-[#111111] text-white">{formatPesos(e.sueldo - e.vales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            </div>
          )}

          {/* VISTA CONTROL COSTOS */}
          {activeTab === 'costos' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Producto mayor aumento" amount={`${data.costos.kpis.mayorAumento.variacion}%`} subtitle={data.costos.kpis.mayorAumento.producto} color="border-red-800" />
                <KpiCard title="Insumo Mayor Gasto" amount={formatPesos(data.costos.kpis.mayorGasto.monto)} subtitle={data.costos.kpis.mayorGasto.producto} color="border-pink-800" />
                <KpiCard title="Muzzarella (Kg)" amount={formatPesos(data.costos.kpis.insumoClave)} color="border-blue-800" />
                <KpiCard title="Alertas" amount={data.costos.kpis.itemsAumento} color="border-yellow-800" />
              </div>
              <TableWrapper title="Monitoreo de Precios Unitarios">
                <table className="w-full text-base lg:text-xl text-left text-white">
                  <thead className="bg-[#111111] font-black text-[var(--color-gold)] uppercase text-[12px] lg:text-sm border-b border-[var(--color-obsidian-border)]">
                    <tr><th className="px-6 py-4">Producto</th><th className="text-right">Anterior</th><th className="text-right font-black">Actual</th><th className="text-center px-6">Variación</th></tr>
                  </thead>
                  <tbody>
                    {data.costos.productos.map((p, i) => (
                      <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-black">{p.nombre}</td>
                        <td className="text-right font-bold text-gray-400">{formatPesos(p.ant)}</td>
                        <td className="text-right font-black text-white">{formatPesos(p.act)}</td>
                        <td className="text-center px-6"><span className={`font-black p-1 px-2 border border-[var(--color-signal)] text-[var(--color-signal)] text-sm`}>{p.var}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            </div>
          )}

          {/* VISTA CONTROL PAGOS */}
          {activeTab === 'pagos' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total Pagado" amount={formatPesos(data.pagos.kpis.total)} color="border-teal-800" />
                <KpiCard title="Mercadería" amount={formatPesos(data.pagos.kpis.cat.m)} color="border-amber-800" />
                <KpiCard title="RRHH" amount={formatPesos(data.pagos.kpis.cat.r)} color="border-blue-800" />
                <KpiCard title="% s/Venta" amount={`${data.pagos.kpis.peso}%`} color="border-pink-800" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartBox title="Pagos por Medio" data={data.pagos.porMedio} type="pie" />
                <ChartBox title="Flujo de Salida" data={data.pagos.salidaDia} type="bar" color={COLORS.pink} />
              </div>
            </div>
          )}

          {/* VISTA FACTURAS (TABLA PROLIJA) */}
          {activeTab === 'facturas' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <KpiCard title="Vencido Urgente" amount={formatPesos(data.facturas.kpis.vencida)} color="border-red-500" icon={<AlertCircle className="text-red-500" />} />
                <KpiCard title="A Vencer (7d)" amount={formatPesos(data.facturas.kpis.aVencer)} color="border-yellow-500" icon={<AlertTriangle className="text-yellow-500" />} />
                <KpiCard title="Pagado Mes" amount={formatPesos(data.facturas.kpis.pagado)} color="border-green-500" icon={<CheckCircle className="text-green-500" />} />
                <KpiCard title="Documentos" amount={data.facturas.kpis.cant} color="border-blue-500" icon={<FileText className="text-blue-500" />} />
              </div>

              <div className="glass-panel overflow-hidden shadow-xl w-full border border-[var(--color-obsidian-border)]">
                <div className="px-6 py-5 border-b border-[var(--color-obsidian-border)] flex justify-between items-center bg-[var(--color-obsidian)]">
                  <h3 className="font-serif font-black text-sm lg:text-base uppercase tracking-widest text-white">Archivo Maestro de Facturación</h3>
                  <button onClick={() => handleAskAi("Gestión de Caja", "¿Cuáles de estas facturas vencidas debo pagar primero según mi flujo de ventas?")} className="text-[var(--color-obsidian)] bg-[var(--color-gold)] p-2 rounded-sm hover:bg-[var(--color-gold-hover)] transition-colors flex items-center space-x-2"><Sparkles size={16} /><span className="text-[12px] font-bold">IA Optimizer ✨</span></button>
                </div>
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full text-left min-w-[950px] text-base lg:text-xl text-white">
                    <thead className="bg-[#111111] text-[12px] lg:text-sm text-[var(--color-gold)] uppercase tracking-widest font-black border-b border-[var(--color-obsidian-border)]">
                      <tr><th className="px-6 py-4">ID Factura</th><th>Proveedor</th><th>Categoría</th><th>Vencimiento</th><th className="text-right">Monto</th><th className="text-center">Estado</th><th className="text-center">Doc</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-obsidian-border)]">
                      {data.facturas.lista.map((f, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 font-mono font-bold whitespace-nowrap text-gray-300">{f.id}</td>
                          <td className="px-6 py-4 font-black">{f.proveedor}</td>
                          <td className="px-6 py-4"><span className="font-bold border-b border-[var(--color-gold)]">{f.cat}</span></td>
                          <td className="px-6 py-4 font-black text-gray-400">{f.ven}</td>
                          <td className="px-6 py-4 text-right font-black">{formatPesos(f.monto)}</td>
                          <td className="px-6 py-4 text-center"><span className={`px-3 py-1 border border-[var(--color-gold)] text-[12px] font-black uppercase text-[var(--color-gold)]`}>{f.estado}</span></td>
                          <td className="px-6 py-4 text-center"><button className="p-2 text-[var(--color-gold)] hover:scale-110 transition-all"><Download size={20} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* AI MODAL */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-[#1a1c23]/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3"><Sparkles size={24} /><div><h3 className="font-black text-xl uppercase tracking-tighter">GastroIA Assist</h3><p className="text-xs font-bold opacity-80">{aiTopic}</p></div></div>
              <button onClick={() => setIsAiModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
              {isAiLoading ? <div className="flex flex-col items-center justify-center py-20"><Loader2 className="animate-spin text-purple-600" size={48} /><p className="text-sm font-bold text-gray-500 mt-4 uppercase tracking-widest">Analizando datos estratégicos...</p></div> : <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-medium">{aiResponse.split('\n').map((line, i) => <p key={i} className="mb-4">{line}</p>)}</div>}
            </div>
            <div className="p-6 bg-white border-t flex justify-end shrink-0"><button onClick={() => setIsAiModalOpen(false)} className="bg-gray-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-800">Cerrar</button></div>
          </div>
        </div>
      )}

      {/* MODAL VENTA DETALLE */}
      {modalVenta && (
        <div className="fixed inset-0 bg-[#1a1c23]/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-8 bg-gray-50 border-b flex justify-between items-center">
              <div className="flex flex-col"><h3 className="font-black text-gray-800 uppercase tracking-tighter text-lg">Detalle Cobro</h3><span className="text-xs font-bold text-teal-500">{modalVenta.fecha}</span></div>
              <button onClick={() => setModalVenta(null)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              {modalVenta.medios.map((m, i) => (<div key={i} className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="text-gray-500 font-bold text-xs uppercase">{m.medio}</span><span className="font-black text-gray-900 text-sm">{formatPesos(m.monto)}</span></div>))}
              <div className="pt-6 flex justify-between items-center border-t-2 border-gray-900 mt-4"><span className="font-black text-lg">TOTAL</span><span className="font-black text-2xl text-teal-600">{formatPesos(modalVenta.total)}</span></div>
            </div>
            <button onClick={() => setModalVenta(null)} className="w-full bg-[#1a1c23] text-white p-6 font-black hover:bg-gray-800 uppercase tracking-widest text-xs">Cerrar</button>
          </div>
        </div>
      )}

      {/* CHAT FLOTANTE GEMINI */}
      <GeminiChat data={data} />
    </div>
  );
}

// --- AUXILIARES ---
function KpiCard({ title, amount, subtitle, icon, color }) {
  const isPositive = color.includes('teal') || color.includes('green');
  const isDanger = color.includes('red') || color.includes('pink') || color.includes('yellow') || color.includes('amber');
  const accentColor = isDanger ? 'var(--color-signal)' : isPositive ? 'var(--color-acid)' : 'var(--color-gold)';

  return (
    <div className="glass-panel p-5 lg:p-6 flex flex-col items-center justify-center text-center card-hover-fx min-h-[160px] h-full relative overflow-hidden group">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-500 group-hover:scale-110 pointer-events-none">
        {React.cloneElement(icon || <Package />, { size: 140, color: '#ffffff' })}
      </div>

      <div className="p-3 bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] text-white shadow-xl rounded-full mb-3 z-10 transition-transform group-hover:-translate-y-1 group-hover:scale-110 duration-300 shrink-0">
        {React.cloneElement(icon || <Package />, { size: 24, color: accentColor })}
      </div>

      <div className="w-full z-10 flex flex-col items-center justify-center flex-1 h-full">
        <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.15em] text-gray-400 font-bold mb-1 px-1 text-center w-full text-balance break-words">{title}</p>
        <h4 className="text-xl sm:text-2xl lg:text-[1.60rem] font-black tracking-tight text-white w-full flex-grow flex items-center justify-center my-2 leading-none text-balance break-words px-2">
          {amount}
        </h4>

        {subtitle && (
          <div className="mt-1 shrink-0 w-full flex justify-center px-2">
            <span className="text-[9px] font-bold px-3 py-1 uppercase tracking-widest border border-white/10 rounded-full inline-block truncate max-w-full" style={{ color: accentColor, background: 'rgba(0,0,0,0.5)' }}>
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartBox({ title, data, type, color = COLORS.gold }) {
  const chartColor = color === COLORS.pink ? COLORS.grey : (color === COLORS.teal ? COLORS.gold : color);

  return (
    <div className="glass-panel p-6 shadow-xl relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-gold)] opacity-[0.02] blur-3xl rounded-full"></div>
      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
        <TrendingUp size={16} className="text-[var(--color-gold)]" /> {title}
      </h3>
      <div className="h-64 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-obsidian-border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#a0a0a0' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a0a0a0', fontWeight: '700' }} tickFormatter={(v) => `$${v / 1000}k`} />
              <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', borderRadius: '0px', color: '#fff' }} itemStyle={{ color: 'var(--color-gold)', fontWeight: 'bold' }} />
              <Bar dataKey="value" fill={chartColor} radius={[0, 0, 0, 0]} barSize={25} />
            </BarChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', borderRadius: '0px', color: '#fff' }} />
              <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#a0a0a0' }} />
            </PieChart>
          ) : type === 'area' ? (
            <AreaChart data={data}>
              <defs><linearGradient id="cT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-obsidian-border)" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#a0a0a0' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a0a0a0', fontWeight: '700' }} tickFormatter={(v) => `$${v / 1000}k`} />
              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', borderRadius: '0px', color: '#fff' }} />
              <Area type="monotone" dataKey="ventas" stroke={COLORS.gold} fillOpacity={1} fill="url(#cT)" strokeWidth={3} />
              <Area type="monotone" dataKey="costos" stroke={COLORS.grey} fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-obsidian-border)" />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#a0a0a0' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a0a0a0', fontWeight: '700' }} />
              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-obsidian)', border: '1px solid var(--color-obsidian-border)', borderRadius: '0px', color: '#fff' }} />
              <Line type="step" dataKey="monto" stroke={chartColor} strokeWidth={3} dot={{ r: 3, fill: 'var(--color-obsidian)', strokeWidth: 2 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TableWrapper({ title, subtitle, children }) {
  return (
    <div className="glass-panel overflow-hidden shadow-xl w-full">
      <div className="p-4 lg:p-6 border-b border-[var(--color-obsidian-border)] bg-[var(--color-obsidian)] flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h3 className="font-black text-white uppercase tracking-widest text-base lg:text-lg">{title}</h3>
          {subtitle && <p className="text-[9px] lg:text-[10px] font-bold text-[var(--color-gold)] uppercase tracking-widest mt-1 opacity-80">{subtitle}</p>}
        </div>
      </div>
      <div className="overflow-x-auto p-0 m-0 w-full max-w-full">
        {/* Child tables should not use slate-200 or black text anymore. We'll let CSS cascade handle general color. */}
        {children}
      </div>
    </div>
  );
}
