import { useState, useEffect } from 'react';
import {
  Settings, Users, Briefcase, CreditCard, Bell, Shield,
  UserPlus, Edit, Save, X, Plus, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useAppContext } from '../AppContext';
import { fetchConfiguraciones, postGestionarUsuario, postGuardarConfiguracion, sha256 } from '../services/api';

// ─── CONSTANTES DE SEGURIDAD (sharp-edges fix) ───────────────────────────────
// Validar contra estos enums antes de enviar a n8n para evitar stringly-typed security.

const MODULOS_VALIDOS = [
  'resumen', 'ventas', 'compras', 'stock', 'rrhh',
  'costos', 'pagos', 'facturas', 'recetario',
];
const MODULOS_LABELS = {
  resumen: 'Resumen', ventas: 'Ventas', compras: 'Compras',
  stock: 'Stock', rrhh: 'RRHH', costos: 'C. Costos',
  pagos: 'C. Pagos', facturas: 'Facturas', recetario: 'Recetario',
};
const ROLES_VALIDOS = ['admin', 'gerente', 'contador', 'cajero', 'empleado'];
const ROL_LABELS = {
  admin: 'Administrador', gerente: 'Gerente', contador: 'Contador',
  cajero: 'Cajero', empleado: 'Empleado',
};
const ROL_MODULOS_DEFAULT = {
  admin:    [...MODULOS_VALIDOS],
  gerente:  ['resumen', 'ventas', 'compras', 'stock', 'pagos', 'facturas'],
  contador: ['compras', 'costos', 'pagos', 'facturas'],
  cajero:   ['ventas', 'pagos'],
  empleado: ['rrhh'],
};
const ROL_EDITABLES_DEFAULT = {
  admin:    [...MODULOS_VALIDOS],
  gerente:  ['ventas', 'pagos'],
  contador: [],
  cajero:   ['ventas', 'pagos'],
  empleado: ['rrhh'],
};
const TIPOS_MEDIO_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia', 'QR', 'Cuenta Corriente', 'Otro'];

const TABS = [
  { id: 'usuarios',       label: 'Usuarios',       icon: Users },
  { id: 'empleados',      label: 'Empleados',       icon: Briefcase },
  { id: 'medios_pago',    label: 'Medios de Pago',  icon: CreditCard },
  { id: 'notificaciones', label: 'Notificaciones',  icon: Bell },
  { id: 'general',        label: 'General',         icon: Settings },
];

const sanitizeModulos = (str) =>
  (str || '').split(',').map(m => m.trim()).filter(m => MODULOS_VALIDOS.includes(m)).join(',');

// ─── DATOS VACÍOS POR DEFECTO ────────────────────────────────────────────────
const EMPTY_CONFIG = {
  usuarios: [], empleados: [], medios_pago: [],
  emails_notificacion: [], alertas: {}, config_general: {}, parametros_sueldos: {},
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function ConfiguracionesDashboard() {
  const { user } = useAuth();
  const { showToast } = useAppContext();

  // Hooks SIEMPRE antes de cualquier return condicional
  const [activeTab, setActiveTab] = useState('usuarios');
  const [configData, setConfigData] = useState(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadConfig = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchConfiguraciones();
      setConfigData(data ?? EMPTY_CONFIG);
    } catch {
      setLoadError('No se pudieron cargar las configuraciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfig(); }, []);

  // Guard DESPUÉS de los hooks
  if (user?.rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Shield size={40} className="mb-3 text-[var(--color-signal)]" />
        <p className="font-black uppercase tracking-widest text-sm text-white">Acceso restringido</p>
        <p className="text-xs mt-2">Esta sección es exclusiva para administradores.</p>
      </div>
    );
  }

  const sharedProps = { data: configData, onSaved: loadConfig, showToast };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings size={18} className="text-[var(--color-gold)]" />
        <h2 className="text-lg font-black uppercase tracking-widest text-white">Configuraciones</h2>
        {loading && (
          <div className="w-4 h-4 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin ml-1" />
        )}
        {!loading && loadError && (
          <button onClick={loadConfig}
            className="flex items-center gap-1 ml-2 text-[10px] text-[var(--color-signal)] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity">
            <RefreshCw size={11} /> Reintentar
          </button>
        )}
        <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)] border border-[var(--color-gold)]/40 px-2 py-1">
          ADMIN
        </span>
      </div>

      {/* Tab nav — siempre visible, no depende de si hay datos */}
      <div className="flex gap-0 border-b border-[var(--color-obsidian-border)] overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'usuarios'       && <TabUsuarios       {...sharedProps} />}
      {activeTab === 'empleados'      && <TabEmpleados      {...sharedProps} />}
      {activeTab === 'medios_pago'    && <TabMediosPago     {...sharedProps} />}
      {activeTab === 'notificaciones' && <TabNotificaciones {...sharedProps} />}
      {activeTab === 'general'        && <TabGeneral        {...sharedProps} />}
    </div>
  );
}

// ─── TAB: USUARIOS ───────────────────────────────────────────────────────────

function TabUsuarios({ data, onSaved, showToast }) {
  const [usuarios, setUsuarios] = useState(data?.usuarios || []);
  const [modal, setModal] = useState(null); // null | 'nuevo' | userObject
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const openNuevo = () => {
    setForm({ nombre: '', email: '', password: '', rol: 'empleado',
      modulos_acceso: ROL_MODULOS_DEFAULT.empleado.join(','),
      puede_editar: ROL_EDITABLES_DEFAULT.empleado.join(','),
      activo: true });
    setModal('nuevo');
  };

  const openEditar = (u) => {
    setForm({ ...u, password: '' });
    setModal(u);
  };

  const handleRolChange = (rol) => {
    if (!ROLES_VALIDOS.includes(rol)) return;
    setForm(f => ({
      ...f, rol,
      modulos_acceso: ROL_MODULOS_DEFAULT[rol]?.join(',') ?? '',
      puede_editar:   ROL_EDITABLES_DEFAULT[rol]?.join(',') ?? '',
    }));
  };

  const toggleModulo = (modulo, field) => {
    if (!MODULOS_VALIDOS.includes(modulo)) return;
    setForm(f => {
      const actual = f[field] ? f[field].split(',').filter(Boolean) : [];
      const next = actual.includes(modulo) ? actual.filter(m => m !== modulo) : [...actual, modulo];
      return { ...f, [field]: next.filter(m => MODULOS_VALIDOS.includes(m)).join(',') };
    });
  };

  const handleSave = async () => {
    if (!form.nombre?.trim() || !form.email?.trim()) {
      return showToast('Nombre y email son obligatorios.', 'error');
    }
    if (!ROLES_VALIDOS.includes(form.rol)) {
      return showToast('Rol inválido.', 'error');
    }
    if (modal === 'nuevo' && !form.password) {
      return showToast('La contraseña es obligatoria para usuarios nuevos.', 'error');
    }
    setSaving(true);
    try {
      const payload = {
        action: modal === 'nuevo' ? 'crear' : 'actualizar',
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        rol: form.rol,
        modulos_acceso: sanitizeModulos(form.modulos_acceso),
        puede_editar: sanitizeModulos(form.puede_editar),
        activo: Boolean(form.activo),
      };
      if (modal === 'nuevo') {
        const maxId = Math.max(0, ...usuarios.map(u => Number(u.usuario_id) || 0));
        payload.usuario_id = maxId + 1;
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        payload.created_at = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
      }
      if (form.password) {
        // SECURITY: SHA-256 es hash rápido. Recomendado: n8n aplica bcrypt server-side.
        payload.password_hash = await sha256(form.password);
      }
      await postGestionarUsuario(payload);
      showToast(modal === 'nuevo' ? 'Usuario creado.' : 'Usuario actualizado.', 'success');
      setModal(null);
      onSaved();
    } catch {
      showToast('Error al guardar usuario. Verificá la conexión.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{usuarios.length} usuarios registrados</p>
        <button onClick={openNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-gold)] text-black text-[11px] font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all">
          <UserPlus size={13} /> Nuevo usuario
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-black/40 text-[var(--color-gold)] text-[10px] uppercase tracking-widest border-b border-[var(--color-obsidian-border)]">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3 hidden sm:table-cell">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-600 font-bold text-xs uppercase tracking-widest">Sin usuarios cargados</td></tr>
            ) : usuarios.map((u, i) => (
              <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-black text-white">{u.nombre}</td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-[var(--color-gold)]/40 text-[var(--color-gold)]">
                    {ROL_LABELS[u.rol] ?? u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                    u.activo ? 'border-green-700/60 text-green-400' : 'border-red-800/60 text-red-400'
                  }`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEditar(u)} className="text-gray-600 hover:text-[var(--color-gold)] transition-colors p-1">
                    <Edit size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ModalForm title={modal === 'nuevo' ? 'Nuevo usuario' : `Editar — ${modal.nombre}`}
          onClose={() => setModal(null)} onSave={handleSave} saving={saving}>
          <FormInput label="Nombre completo" value={form.nombre} onChange={v => setForm(f => ({...f, nombre: v}))} required />
          <FormInput label="Email" type="email" value={form.email} onChange={v => setForm(f => ({...f, email: v}))} required />
          <FormInput
            label={modal === 'nuevo' ? 'Contraseña' : 'Nueva contraseña (vacío = sin cambios)'}
            type="password" value={form.password}
            onChange={v => setForm(f => ({...f, password: v}))}
            required={modal === 'nuevo'}
          />

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Rol</label>
            <select value={form.rol} onChange={e => handleRolChange(e.target.value)}
              className="w-full bg-black/40 border border-[var(--color-obsidian-border)] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--color-gold)]">
              {ROLES_VALIDOS.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
            </select>
          </div>

          <ModulosSelector
            label="Puede ver" field="modulos_acceso"
            value={form.modulos_acceso} onToggle={m => toggleModulo(m, 'modulos_acceso')}
            color="gold"
          />
          <ModulosSelector
            label="Puede editar" field="puede_editar"
            value={form.puede_editar} onToggle={m => toggleModulo(m, 'puede_editar')}
            color="acid"
          />

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</span>
            <button type="button" onClick={() => setForm(f => ({...f, activo: !f.activo}))}
              className={`flex items-center gap-2 text-xs font-bold transition-colors ${form.activo ? 'text-green-400' : 'text-gray-500'}`}>
              {form.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              {form.activo ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        </ModalForm>
      )}
    </div>
  );
}

// ─── TAB: EMPLEADOS ──────────────────────────────────────────────────────────

function TabEmpleados({ data, onSaved, showToast }) {
  const [empleados, setEmpleados] = useState(data?.empleados || []);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const EMPTY = { nombre: '', email: '', puesto: '', local: '', sueldo_base: '', hora_extra_pct: '50', comision_pct: '0', activo: true };

  const openNuevo = () => { setForm(EMPTY); setModal('nuevo'); };
  const openEditar = (e) => { setForm(e); setModal(e); };

  const handleSave = async () => {
    if (!form.nombre?.trim()) return showToast('El nombre es obligatorio.', 'error');
    setSaving(true);
    try {
      const nuevos = modal === 'nuevo'
        ? [...empleados, { ...form, id: Date.now().toString() }]
        : empleados.map(e => e.nombre === modal.nombre ? { ...form } : e);
      await postGuardarConfiguracion('empleados', nuevos);
      showToast(modal === 'nuevo' ? 'Empleado agregado.' : 'Empleado actualizado.', 'success');
      setModal(null);
      onSaved();
    } catch {
      showToast('Error al guardar empleado.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{empleados.length} empleados</p>
        <button onClick={openNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-gold)] text-black text-[11px] font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all">
          <Plus size={13} /> Nuevo empleado
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-black/40 text-[var(--color-gold)] text-[10px] uppercase tracking-widest border-b border-[var(--color-obsidian-border)]">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3 hidden md:table-cell">Puesto</th>
              <th className="px-4 py-3 hidden lg:table-cell">Local</th>
              <th className="px-4 py-3">Sueldo base</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {empleados.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-600 font-bold text-xs uppercase tracking-widest">Sin empleados cargados</td></tr>
            ) : empleados.map((e, i) => (
              <tr key={i} className="border-b border-[var(--color-obsidian-border)] hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-black text-white">{e.nombre}</td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{e.puesto}</td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">{e.local}</td>
                <td className="px-4 py-3 text-white font-bold">{e.sueldo_base ? `$ ${Number(e.sueldo_base).toLocaleString('es-AR')}` : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                    e.activo ? 'border-green-700/60 text-green-400' : 'border-red-800/60 text-red-400'
                  }`}>
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEditar(e)} className="text-gray-600 hover:text-[var(--color-gold)] transition-colors p-1">
                    <Edit size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ModalForm title={modal === 'nuevo' ? 'Nuevo empleado' : `Editar — ${modal.nombre}`}
          onClose={() => setModal(null)} onSave={handleSave} saving={saving}>
          <FormInput label="Nombre completo" value={form.nombre} onChange={v => setForm(f => ({...f, nombre: v}))} required />
          <FormInput label="Email" type="email" value={form.email} onChange={v => setForm(f => ({...f, email: v}))} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Puesto" value={form.puesto} onChange={v => setForm(f => ({...f, puesto: v}))} />
            <FormInput label="Local / Sede" value={form.local} onChange={v => setForm(f => ({...f, local: v}))} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Sueldo base $" type="number" value={form.sueldo_base} onChange={v => setForm(f => ({...f, sueldo_base: v}))} />
            <FormInput label="Hora extra %" type="number" value={form.hora_extra_pct} onChange={v => setForm(f => ({...f, hora_extra_pct: v}))} />
            <FormInput label="Comisión %" type="number" value={form.comision_pct} onChange={v => setForm(f => ({...f, comision_pct: v}))} />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</span>
            <button type="button" onClick={() => setForm(f => ({...f, activo: !f.activo}))}
              className={`flex items-center gap-2 text-xs font-bold transition-colors ${form.activo ? 'text-green-400' : 'text-gray-500'}`}>
              {form.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              {form.activo ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        </ModalForm>
      )}
    </div>
  );
}

// ─── TAB: MEDIOS DE PAGO ─────────────────────────────────────────────────────

function TabMediosPago({ data, onSaved, showToast }) {
  const [medios, setMedios] = useState(data?.medios_pago || []);
  const [showForm, setShowForm] = useState(false);
  const [nuevoMedio, setNuevoMedio] = useState({ tipo: 'Efectivo', nombre: '', comision_pct: '', activo: true });
  const [saving, setSaving] = useState(false);

  const toggleActivo = (i) => {
    setMedios(prev => prev.map((m, idx) => idx === i ? { ...m, activo: !m.activo } : m));
  };

  const eliminar = (i) => {
    setMedios(prev => prev.filter((_, idx) => idx !== i));
  };

  const agregarMedio = () => {
    if (!nuevoMedio.tipo) return;
    setMedios(prev => [...prev, { ...nuevoMedio }]);
    setNuevoMedio({ tipo: 'Efectivo', nombre: '', comision_pct: '', activo: true });
    setShowForm(false);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await postGuardarConfiguracion('medios_pago', medios);
      showToast('Medios de pago guardados.', 'success');
      onSaved();
    } catch {
      showToast('Error al guardar medios de pago.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Lista de medios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {medios.map((m, i) => (
          <div key={i} className={`glass-panel p-4 border transition-all ${m.activo ? 'border-[var(--color-obsidian-border)]' : 'border-gray-800 opacity-60'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-black text-white text-sm">{m.tipo}</p>
                {m.nombre && <p className="text-[11px] text-gray-400 font-bold">{m.nombre}</p>}
                {m.comision_pct && <p className="text-[10px] text-[var(--color-gold)] font-bold mt-1">Comisión: {m.comision_pct}%</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleActivo(i)} title={m.activo ? 'Desactivar' : 'Activar'}
                  className={`p-1.5 transition-colors ${m.activo ? 'text-green-400 hover:text-red-400' : 'text-gray-600 hover:text-green-400'}`}>
                  {m.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button onClick={() => eliminar(i)} className="p-1.5 text-gray-600 hover:text-[var(--color-signal)] transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${
              m.activo ? 'border-green-700/60 text-green-400' : 'border-gray-700 text-gray-600'
            }`}>
              {m.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        ))}

        {/* Card agregar nuevo */}
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="glass-panel p-4 border border-dashed border-gray-700 hover:border-[var(--color-gold)]/50 transition-all flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-[var(--color-gold)] min-h-[100px]">
            <Plus size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Agregar medio</span>
          </button>
        )}
      </div>

      {/* Mini formulario agregar */}
      {showForm && (
        <div className="glass-panel p-5 border border-[var(--color-gold)]/30 space-y-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-gold)]">Nuevo medio de pago</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Tipo</label>
              <select value={nuevoMedio.tipo} onChange={e => setNuevoMedio(n => ({...n, tipo: e.target.value}))}
                className="w-full bg-black/40 border border-[var(--color-obsidian-border)] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--color-gold)]">
                {TIPOS_MEDIO_PAGO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <FormInput label="Nombre / Banco (opcional)" value={nuevoMedio.nombre}
              onChange={v => setNuevoMedio(n => ({...n, nombre: v}))} placeholder="Ej: Visa, Galicia..." />
            <FormInput label="Comisión %" type="number" value={nuevoMedio.comision_pct}
              onChange={v => setNuevoMedio(n => ({...n, comision_pct: v}))} placeholder="0" />
          </div>
          <div className="flex gap-3">
            <button onClick={agregarMedio}
              className="px-4 py-2 bg-[var(--color-gold)] text-black text-[11px] font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] transition-all">
              Agregar
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-700 text-gray-400 text-[11px] font-black uppercase tracking-widest hover:text-white transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Guardar */}
      <div className="flex justify-end">
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-gold)] text-black text-[11px] font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] disabled:opacity-50 transition-all">
          {saving ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

// ─── TAB: NOTIFICACIONES ─────────────────────────────────────────────────────

function TabNotificaciones({ data, onSaved, showToast }) {
  const [emails, setEmails] = useState(data?.emails_notificacion || []);
  const [alertas, setAlertas] = useState(data?.alertas || {
    stock_minimo_dias: 7,
    facturas_vencimiento_dias: 3,
    compras_umbral_alerta: 100000,
  });
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const agregarEmail = () => {
    const email = nuevoEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (emails.includes(email)) return;
    setEmails(prev => [...prev, email]);
    setNuevoEmail('');
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await postGuardarConfiguracion('notificaciones', { emails_notificacion: emails, alertas });
      showToast('Notificaciones guardadas.', 'success');
      onSaved();
    } catch {
      showToast('Error al guardar notificaciones.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Emails */}
      <div className="glass-panel p-5 space-y-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-gold)]">Emails de notificación</p>
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {emails.map((email, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/5 border border-[var(--color-obsidian-border)] px-3 py-1">
              {email}
              <button onClick={() => setEmails(e => e.filter((_, idx) => idx !== i))}
                className="text-gray-600 hover:text-[var(--color-signal)] transition-colors ml-1">
                <X size={12} />
              </button>
            </span>
          ))}
          {emails.length === 0 && <span className="text-xs text-gray-600 font-bold">Sin emails configurados</span>}
        </div>
        <div className="flex gap-3">
          <input
            type="email"
            value={nuevoEmail}
            onChange={e => setNuevoEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarEmail()}
            placeholder="nuevo@email.com"
            className="flex-1 bg-black/40 border border-[var(--color-obsidian-border)] text-white text-sm px-3 py-2 focus:outline-none focus:border-[var(--color-gold)] placeholder:text-gray-600"
          />
          <button onClick={agregarEmail}
            className="px-4 py-2 bg-white/5 border border-[var(--color-obsidian-border)] text-white text-[11px] font-black uppercase tracking-widest hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-all">
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Umbrales de alertas */}
      <div className="glass-panel p-5 space-y-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-gold)]">Umbrales de alertas</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FormInput
            label="Alerta stock (días antes de agotarse)"
            type="number"
            value={String(alertas.stock_minimo_dias)}
            onChange={v => setAlertas(a => ({...a, stock_minimo_dias: Number(v)}))}
          />
          <FormInput
            label="Alerta facturas vencimiento (días)"
            type="number"
            value={String(alertas.facturas_vencimiento_dias)}
            onChange={v => setAlertas(a => ({...a, facturas_vencimiento_dias: Number(v)}))}
          />
          <FormInput
            label="Umbral alerta compras ($)"
            type="number"
            value={String(alertas.compras_umbral_alerta)}
            onChange={v => setAlertas(a => ({...a, compras_umbral_alerta: Number(v)}))}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-gold)] text-black text-[11px] font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] disabled:opacity-50 transition-all">
          {saving ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

// ─── TAB: GENERAL ────────────────────────────────────────────────────────────

function TabGeneral({ data, onSaved, showToast }) {
  const [config, setConfig] = useState(data?.config_general || {
    nombre_local: '',
    zona_horaria: 'America/Argentina/Buenos_Aires',
    moneda: 'ARS',
    direccion: '',
  });
  const [params, setParams] = useState(data?.parametros_sueldos || {
    valor_hora_base: '',
    valor_hora_extra_pct: '50',
    periodo_pago: 'mensual',
    dia_pago: '5',
  });
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    try {
      await postGuardarConfiguracion('general', { config_general: config, parametros_sueldos: params });
      showToast('Configuración general guardada.', 'success');
      onSaved();
    } catch {
      showToast('Error al guardar configuración.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 space-y-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-gold)]">Datos del local</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Nombre del local" value={config.nombre_local}
            onChange={v => setConfig(c => ({...c, nombre_local: v}))} />
          <FormInput label="Dirección" value={config.direccion}
            onChange={v => setConfig(c => ({...c, direccion: v}))} />
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Zona horaria</label>
            <select value={config.zona_horaria} onChange={e => setConfig(c => ({...c, zona_horaria: e.target.value}))}
              className="w-full bg-black/40 border border-[var(--color-obsidian-border)] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--color-gold)]">
              <option value="America/Argentina/Buenos_Aires">Argentina (GMT-3)</option>
              <option value="America/Santiago">Chile (GMT-3/-4)</option>
              <option value="America/Bogota">Colombia (GMT-5)</option>
              <option value="America/Mexico_City">México (GMT-6)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Moneda</label>
            <select value={config.moneda} onChange={e => setConfig(c => ({...c, moneda: e.target.value}))}
              className="w-full bg-black/40 border border-[var(--color-obsidian-border)] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--color-gold)]">
              <option value="ARS">ARS — Peso argentino</option>
              <option value="CLP">CLP — Peso chileno</option>
              <option value="COP">COP — Peso colombiano</option>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="USD">USD — Dólar</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel p-5 space-y-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-gold)]">Parámetros de sueldos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormInput label="Valor hora base $" type="number" value={params.valor_hora_base}
            onChange={v => setParams(p => ({...p, valor_hora_base: v}))} />
          <FormInput label="Hora extra %" type="number" value={params.valor_hora_extra_pct}
            onChange={v => setParams(p => ({...p, valor_hora_extra_pct: v}))} />
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Período de pago</label>
            <select value={params.periodo_pago} onChange={e => setParams(p => ({...p, periodo_pago: e.target.value}))}
              className="w-full bg-black/40 border border-[var(--color-obsidian-border)] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--color-gold)]">
              <option value="mensual">Mensual</option>
              <option value="quincenal">Quincenal</option>
              <option value="semanal">Semanal</option>
            </select>
          </div>
          <FormInput label="Día de pago" type="number" value={params.dia_pago}
            onChange={v => setParams(p => ({...p, dia_pago: v}))} placeholder="5" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-gold)] text-black text-[11px] font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] disabled:opacity-50 transition-all">
          {saving ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

// ─── COMPONENTES COMPARTIDOS ─────────────────────────────────────────────────

function ModalForm({ title, children, onClose, onSave, saving }) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--color-obsidian-light)] border border-[var(--color-obsidian-border)] w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-obsidian-border)]">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--color-gold)]">{title}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="flex gap-3 p-5 border-t border-[var(--color-obsidian-border)] justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-[11px] font-black uppercase tracking-widest border border-[var(--color-obsidian-border)] text-gray-400 hover:text-white hover:border-gray-500 transition-all">
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[var(--color-gold)] text-black text-[11px] font-black uppercase tracking-widest hover:bg-[var(--color-gold-hover)] disabled:opacity-50 transition-all">
            {saving
              ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <Save size={13} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange, required, placeholder }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
        {label}{required && <span className="text-[var(--color-signal)] ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-[var(--color-obsidian-border)] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--color-gold)] placeholder:text-gray-600 transition-colors"
      />
    </div>
  );
}

function ModulosSelector({ label, value, onToggle, color }) {
  const activos = value ? value.split(',').filter(Boolean) : [];
  const borderClass = color === 'acid'
    ? 'border-[var(--color-acid)] text-[var(--color-acid)] bg-[var(--color-acid)]/10'
    : 'border-[var(--color-gold)] text-[var(--color-gold)] bg-[var(--color-gold)]/10';

  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {MODULOS_VALIDOS.map(m => {
          const active = activos.includes(m);
          return (
            <button key={m} type="button" onClick={() => onToggle(m)}
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 border transition-all ${
                active ? borderClass : 'border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
              }`}>
              {MODULOS_LABELS[m]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
