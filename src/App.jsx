import React, { useState, useEffect } from 'react';
import { callGeminiWithContext, postStockMovement } from './services/api';
import GeminiChat from './components/GeminiChat';
import StockDashboard from './components/StockDashboard';
import ResumenDashboard from './components/ResumenDashboard';
import VentasDashboard from './components/VentasDashboard';
import ComprasDashboard from './components/ComprasDashboard';
import PagosDashboard from './components/PagosDashboard';
import FacturasDashboard from './components/FacturasDashboard';
import RRHHDashboard from './components/RRHHDashboard';
import LoginScreen from './components/LoginScreen';
import { ToastContainer } from './components/ToastNotification';
import { AppProvider, useAppContext } from './AppContext';
import { AuthProvider, useAuth } from './AuthContext';
import { KpiCard, ChartBox, TableWrapper, formatPesos, COLORS } from './components/SharedComponents';
import {
  LayoutDashboard, ShoppingCart, DollarSign, Users, FileText,
  CreditCard, TrendingDown, TrendingUp, Calendar, Menu, X,
  AlertCircle, AlertTriangle, CheckCircle, Box, BookOpen,
  ChevronLeft, Sparkles, Loader2, LogOut
} from 'lucide-react';
import RecetarioDashboard from './components/RecetarioDashboard';

// --- DATOS INICIALES (fallback si n8n no responde) ---
const initialData = {
  resumen: { kpis: [], tendencia: [] },
  ventas: { acumuladas: 0, promedioDiario: 0, mejorTurno: '', porTurno: [], porMedioPago: [], porDia: [] },
  compras: { kpis: {}, porCategoria: [], tendencia: [], rankingDeuda: [], facturas: [] },
  rrhh: { kpis: {}, porArea: [], empleados: [] },
  costos: { kpis: { mayorAumento: { variacion: 0, producto: '' }, mayorGasto: { monto: 0, producto: '' } }, topInsumos: [], evolucion: [], productos: [] },
  pagos: { kpis: { cat: {} }, porMedio: [], salidaDia: [], lista: [] },
  facturas: { kpis: {}, lista: [] },
  stock: {
    kpis: {
      valorInventario: 1250000,
      mermasTotales: 45000,
      alertasCriticas: 3,
      cmvMensual: 850000
    },
    inventario: [
      { id: 1, categoria: 'Bebidas', producto: 'Coca Cola 1.5L', unidad: 'Botella', stockInicial: 50, compras: 120, stockFinal: 45, merma: 2, precioUnitario: 1500, proveedor: 'Distribuidora Norte' },
      { id: 2, categoria: 'Insumos', producto: 'Harina 0000', unidad: 'Kg', stockInicial: 100, compras: 50, stockFinal: 20, merma: 0, precioUnitario: 650, proveedor: 'Molinos Rio' },
      { id: 3, categoria: 'Lácteos', producto: 'Muzzarella', unidad: 'Kg', stockInicial: 30, compras: 40, stockFinal: 15, merma: 1, precioUnitario: 4500, proveedor: 'Lácteos Sur' },
      { id: 4, categoria: 'Carnes', producto: 'Carne Picada', unidad: 'Kg', stockInicial: 10, compras: 20, stockFinal: 2, merma: 0, precioUnitario: 5200, proveedor: 'Frigorífico Central' }
    ],
    cmvHistorial: [
      { mes: 'Oct', cmv: 780000 },
      { mes: 'Nov', cmv: 820000 },
      { mes: 'Dic', cmv: 950000 },
      { mes: 'Ene', cmv: 850000 }
    ],
    movimientos: [
      { id: 1, fecha: '2024-01-01 10:00', responsable: 'Admin', tipo: 'Generación Inicial', producto: 'Todos', cantidad: 0, motivo: 'Carga del sistema' }
    ]
  }
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  return (
    <AuthProvider>
      <AppProvider initialData={initialData}>
        <AppGate />
      </AppProvider>
    </AuthProvider>
  );
}

function AppGate() {
  const { user } = useAuth();
  if (!user) return <LoginScreen />;
  return <AppInner />;
}

function AppInner() {
  const { data, setData, isLoading, toasts, removeToast, showToast, refreshData } = useAppContext();
  const { user, logout, puedeVer } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');

  // Carga inicial de datos desde n8n
  useEffect(() => {
    refreshData();
  }, []);

  const allMenuItems = [
    { id: 'dashboard', label: 'Resumen',       icon: LayoutDashboard, modulo: 'resumen' },
    { id: 'ventas',    label: 'Ventas',         icon: TrendingUp,      modulo: 'ventas' },
    { id: 'compras',   label: 'Compras',        icon: ShoppingCart,    modulo: 'compras' },
    { id: 'stock',     label: 'Stock',          icon: Box,             modulo: 'stock' },
    { id: 'rrhh',      label: 'RRHH',           icon: Users,           modulo: 'rrhh' },
    { id: 'costos',    label: 'Control Costos', icon: TrendingDown,    modulo: 'compras' },
    { id: 'pagos',     label: 'Control Pagos',  icon: CreditCard,      modulo: 'pagos' },
    { id: 'facturas',  label: 'Facturas',       icon: FileText,        modulo: 'facturas' },
    { id: 'recetario', label: 'Recetario',      icon: BookOpen,        modulo: 'recetario' },
  ];

  const menuItems = allMenuItems.filter(item => puedeVer(item.modulo));

  const handleAskAi = async (topic, prompt) => {
    setAiTopic(topic);
    setIsAiModalOpen(true);
    setAiResponse('');
    setIsAiLoading(true);
    const sys = 'Eres consultor gastronómico experto. Analiza datos y da sugerencias breves, directas y profesionales en español latino.';
    try {
      const result = await callGeminiWithContext(`Estado del negocio: ${JSON.stringify(data)}\n\nConsulta: ${prompt}`, sys);
      setAiResponse(result);
    } catch {
      setAiResponse('Hubo un problema de conexión con el asistente estratégico.');
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#1a1c23] text-white">
      <div className="w-12 h-12 border-4 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-black italic tracking-widest uppercase text-[var(--color-gold)]">GASTRO DASH</h2>
      <p className="text-xs text-gray-500 font-bold mt-2 uppercase tracking-widest">Cargando datos...</p>
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

      {/* SIDEBAR */}
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
        {/* HEADER */}
        <header className="bg-[var(--color-obsidian)] border-b border-[var(--color-obsidian-border)] px-6 h-[72px] flex items-center justify-between z-30">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/5 hover:bg-white/10 rounded-sm transition-colors text-[var(--color-gold)] border border-transparent hover:border-[var(--color-gold)]">
              {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg lg:text-xl font-black uppercase tracking-widest text-white truncate w-32 sm:w-auto">
              {allMenuItems.find(m => m.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[11px] font-black text-white leading-none">{user?.nombre}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-gold)] mt-0.5">{user?.rol}</span>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-2 border border-[var(--color-obsidian-border)] text-gray-400 hover:border-[var(--color-signal)] hover:text-[var(--color-signal)] transition-all"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 bg-[var(--color-obsidian-light)]">

          {activeTab === 'dashboard' && <ResumenDashboard data={data} />}

          {activeTab === 'ventas' && <VentasDashboard data={data} onUpdate={refreshData} />}

          {activeTab === 'compras' && <ComprasDashboard data={data} />}

          {activeTab === 'rrhh' && <RRHHDashboard data={data} onUpdate={refreshData} />}

          {activeTab === 'costos' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Mayor Aumento" amount={`${data.costos.kpis.mayorAumento.variacion}%`} subtitle={data.costos.kpis.mayorAumento.producto} color="border-red-800" icon={<TrendingUp className="text-red-400" />} />
                <KpiCard title="Insumo Mayor Gasto" amount={formatPesos(data.costos.kpis.mayorGasto.monto)} subtitle={data.costos.kpis.mayorGasto.producto} color="border-pink-800" icon={<DollarSign className="text-pink-400" />} />
                <KpiCard title="Alertas de Precio" amount={data.costos.kpis.itemsAumento ?? 0} color="border-yellow-800" icon={<AlertTriangle className="text-yellow-400" />} />
              </div>
              <TableWrapper title="Monitoreo de Precios Unitarios">
                <table className="w-full text-base lg:text-xl text-left text-white">
                  <thead className="bg-[#111111] font-black text-[var(--color-gold)] uppercase text-[12px] lg:text-sm border-b border-[var(--color-obsidian-border)]">
                    <tr>
                      <th className="px-6 py-4">Producto</th>
                      <th className="text-right">Anterior</th>
                      <th className="text-right font-black">Actual</th>
                      <th className="text-center px-6">Variación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.costos.productos.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-bold text-sm">Sin datos de precios.</td></tr>
                    ) : data.costos.productos.map((p, i) => (
                      <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-black">{p.nombre}</td>
                        <td className="text-right font-bold text-gray-400">{formatPesos(p.ant)}</td>
                        <td className="text-right font-black text-white">{formatPesos(p.act)}</td>
                        <td className="text-center px-6">
                          <span className="font-black p-1 px-2 border border-[var(--color-signal)] text-[var(--color-signal)] text-sm">{p.var}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            </div>
          )}

          {activeTab === 'pagos' && <PagosDashboard data={data} onUpdate={refreshData} />}

          {activeTab === 'facturas' && <FacturasDashboard data={data} onUpdate={refreshData} onAskAi={handleAskAi} />}

          {activeTab === 'recetario' && <RecetarioDashboard data={data} />}

          {activeTab === 'stock' && (
            <StockDashboard
              data={data}
              onUpdateStock={(newStock) => {
                setData(prev => ({ ...prev, stock: { ...prev.stock, inventario: newStock } }));
              }}
              onAddMovimiento={async (movimiento) => {
                const newMov = { ...movimiento, id: Date.now() };
                setData(prev => ({
                  ...prev,
                  stock: {
                    ...prev.stock,
                    movimientos: [newMov, ...(prev.stock.movimientos || [])]
                  }
                }));
                try {
                  await postStockMovement(movimiento);
                } catch (err) {
                  console.error('Fallo al sincronizar movimiento con n8n:', err);
                }
              }}
            />
          )}

        </main>
      </div>

      {/* AI MODAL */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-[#1a1c23]/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <Sparkles size={24} />
                <div>
                  <h3 className="font-black text-xl uppercase tracking-tighter">GastroIA Assist</h3>
                  <p className="text-xs font-bold opacity-80">{aiTopic}</p>
                </div>
              </div>
              <button onClick={() => setIsAiModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
              {isAiLoading
                ? <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-purple-600" size={48} />
                    <p className="text-sm font-bold text-gray-500 mt-4 uppercase tracking-widest">Analizando datos estratégicos...</p>
                  </div>
                : <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-medium">
                    {aiResponse.split('\n').map((line, i) => <p key={i} className="mb-4">{line}</p>)}
                  </div>
              }
            </div>
            <div className="p-6 bg-white border-t flex justify-end shrink-0">
              <button onClick={() => setIsAiModalOpen(false)} className="bg-gray-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-800">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT FLOTANTE GEMINI */}
      <GeminiChat data={data} />

      {/* TOASTS */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
