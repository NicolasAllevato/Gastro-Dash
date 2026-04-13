// URL del Webhook de n8n desde el archivo .env
const N8N_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const N8N_LOGIN_URL = import.meta.env.VITE_N8N_LOGIN_URL;
// API Key de Gemini desde el archivo .env
// SECURITY NOTE: VITE_ vars quedan expuestas en el bundle JS del browser.
// Riesgo arquitectónico aceptado (sin backend propio). Rotar la key si se filtra.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// URL del Webhook de n8n para posteos (movimientos)
const N8N_POST_URL = import.meta.env.VITE_N8N_WEBHOOK_POST_URL;
// URLs de webhooks POST por módulo
const N8N_POST_VENTA_URL = import.meta.env.VITE_N8N_POST_VENTA_URL;
const N8N_POST_PAGO_URL = import.meta.env.VITE_N8N_POST_PAGO_URL;
const N8N_POST_FACTURA_URL = import.meta.env.VITE_N8N_POST_FACTURA_URL;
const N8N_POST_RRHH_URL = import.meta.env.VITE_N8N_POST_RRHH_URL;
const N8N_POST_FACTURA_UPLOAD_URL = import.meta.env.VITE_N8N_POST_FACTURA_UPLOAD_URL;
// URLs de Configuraciones
const N8N_CONFIG_GET_URL = import.meta.env.VITE_N8N_CONFIG_GET_URL;
const N8N_GUARDAR_CONFIG_URL = import.meta.env.VITE_N8N_GUARDAR_CONFIG_URL;
const N8N_GESTIONAR_USUARIO_URL = import.meta.env.VITE_N8N_GESTIONAR_USUARIO_URL;
// URL dedicada para actualizar insumos en COSTOS (workflow_guardar_costos)
const N8N_GUARDAR_COSTOS_URL = import.meta.env.VITE_N8N_GUARDAR_COSTOS_URL;
// Token de autenticación para webhooks POST
const WEBHOOK_SECRET = import.meta.env.VITE_N8N_WEBHOOK_SECRET || '';

// Timeout por defecto para todos los fetch (15s) — insecure-defaults fix
const FETCH_TIMEOUT_MS = 15000;

/**
 * Hashea un string con SHA-256 (nativo en browsers modernos)
 */
export const sha256 = async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Login: envía email + password_hash a n8n, retorna datos de usuario
 */
export const postLogin = async (email, password) => {
    if (!N8N_LOGIN_URL) throw new Error('VITE_N8N_LOGIN_URL no configurada');
    const password_hash = await sha256(password);
    const response = await fetch(N8N_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password_hash }),
    });
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
    return await response.json();
};

/**
 * Normaliza la respuesta de n8n al formato que espera el frontend.
 * Centraliza todos los mapeos de campos para no tocar cada componente.
 */
const normalizeApiResponse = (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    return {
        ...raw,

        // resumen.kpis: n8n manda {label, value, formato} → frontend espera {titulo, valor, tipo}
        resumen: {
            ...raw.resumen,
            kpis: (raw.resumen?.kpis || []).map(k => ({
                titulo: k.titulo ?? k.label ?? '',
                valor: k.valor ?? k.value ?? 0,
                tipo: k.tipo ?? (k.formato === 'pesos' ? 'positivo' : 'neutro'),
                variacion: k.variacion ?? null,
            })),
        },

        // compras.kpis: n8n manda totalCompras, frontend usa totales
        compras: {
            ...raw.compras,
            kpis: {
                ...raw.compras?.kpis,
                totales: raw.compras?.kpis?.totales ?? raw.compras?.kpis?.totalCompras ?? 0,
            },
        },

        // rrhh: sueldosAPagar no llega aún, filtrar porArea con "undefined"
        rrhh: {
            ...raw.rrhh,
            kpis: {
                sueldosAPagar: 0,
                ...raw.rrhh?.kpis,
            },
            porArea: (raw.rrhh?.porArea || []).filter(a => a.area && a.area !== 'undefined'),
        },

        // costos: mayorGasto sin producto, y filtrar filas vacías de productos
        costos: {
            ...raw.costos,
            kpis: {
                ...raw.costos?.kpis,
                mayorGasto: {
                    monto: raw.costos?.kpis?.mayorGasto?.monto ?? 0,
                    producto: raw.costos?.kpis?.mayorGasto?.producto ?? '',
                },
            },
            productos: (raw.costos?.productos || []).filter(p => p.nombre).map(p => ({
                ...p,
                unidad: p.unidad ?? '',
                categoria: p.categoria ?? '',
                merma: p.merma ?? 0,
            })),
        },

        // facturas: filtrar filas fantasma sin id real
        facturas: {
            ...raw.facturas,
            lista: (raw.facturas?.lista || []).filter(f => f.id && String(f.id).trim() !== ''),
        },

        // stock: deduplicar por producto (n8n puede mandar una fila por compra),
        // acumulando la cantidad comprada del mes en el campo "compras"
        stock: {
            ...raw.stock,
            inventario: (() => {
                const rows = (raw.stock?.inventario || [])
                    .map(item => ({
                        producto: '',
                        categoria: '',
                        unidad: '',
                        proveedor: '',
                        stockInicial: 0,
                        stockFinal: 0,
                        merma: 0,
                        precioUnitario: 0,
                        compras: 0,
                        ...item,
                    }))
                    .filter(item => item.producto && item.producto.trim() !== '');

                // Agrupar por nombre de producto (case-insensitive)
                const map = new Map();
                for (const item of rows) {
                    const key = item.producto.trim().toLowerCase();
                    if (map.has(key)) {
                        const existing = map.get(key);
                        map.set(key, {
                            ...existing,
                            compras: (Number(existing.compras) || 0) + (Number(item.compras) || 0),
                            stockFinal: item.stockFinal ?? existing.stockFinal,
                            stockActual: item.stockActual ?? existing.stockActual,
                        });
                    } else {
                        map.set(key, { ...item });
                    }
                }
                return Array.from(map.values());
            })(),
        },

        // ventas: normalizar canales + porDia (filas planas → turnos anidado)
        ventas: (() => {
            const canales = (raw.ventas?.canales || [])
                .filter(c => c && (c.nombre || c.name || c.Canal || typeof c === 'string'))
                .map(c => typeof c === 'string' ? { nombre: c } : { nombre: c.nombre ?? c.Canal ?? c.name ?? '' });

            // Agrupar filas por fecha+canal acumulando turnos
            const map = new Map();
            for (const d of (raw.ventas?.porDia || [])) {
                if (!d.fecha) continue;
                const key = `${d.fecha}||${d.canal || ''}`;
                if (map.has(key)) {
                    const ex = map.get(key);
                    // Si ya tiene turnos anidado (n8n los mandó agrupados), no tocar
                    if (d.turnos && typeof d.turnos === 'object') {
                        Object.assign(ex.turnos, d.turnos);
                        ex.total = (Number(ex.total) || 0) + (Number(d.total) || 0);
                    } else if (d.turno) {
                        const v = Number(d.total ?? d.total_venta ?? 0);
                        ex.turnos[d.turno] = (Number(ex.turnos[d.turno]) || 0) + v;
                        ex.total = (Number(ex.total) || 0) + v;
                        ex.turno = d.turno; // último turno de la fecha
                    }
                } else {
                    const item = { ...d };
                    if (!item.turnos || typeof item.turnos !== 'object') {
                        const v = Number(item.total ?? item.total_venta ?? 0);
                        item.turnos = item.turno ? { [item.turno]: v } : {};
                        item.total = item.total ?? item.total_venta ?? 0;
                    }
                    map.set(key, item);
                }
            }

            return { ...raw.ventas, canales, porDia: Array.from(map.values()) };
        })(),
    };
};

/**
 * Función para obtener los datos de negocio desde n8n.
 * Acepta filtros { desde, hasta } como query params opcionales (formato yyyy-MM-dd).
 */
export const fetchBusinessData = async (filtros = {}) => {
    if (!N8N_URL) {
        throw new Error('Sin URL de webhook n8n configurada.');
    }

    let url = N8N_URL;
    if (filtros.desde || filtros.hasta) {
        const params = new URLSearchParams();
        if (filtros.desde) params.set('desde', filtros.desde);
        if (filtros.hasta) params.set('hasta', filtros.hasta);
        url = `${N8N_URL}?${params.toString()}`;
    }

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Error HTTP de n8n: ${response.status}`);
        }

        const data = await response.json();
        return normalizeApiResponse(data);
    } catch (error) {
        throw error;
    } finally {
        clearTimeout(timerId);
    }
};

/**
 * Función para enviar movimientos de stock a n8n
 */
export const postStockMovement = async (movimientoPayload) => {
    if (!N8N_POST_URL) return;

    const response = await fetch(N8N_POST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movimientoPayload)
    });

    if (!response.ok) {
        throw new Error(`Error HTTP de n8n al intentar postear: ${response.status}`);
    }

    return await response.json();
};

/**
 * Función genérica para enviar datos POST a un webhook n8n.
 * Incluye timeout (15s) y header de autenticación X-Webhook-Token.
 */
const postToWebhook = async (url, payload, nombreAccion) => {
    if (!url) return { ok: false, fallback: true };
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Token': WEBHOOK_SECRET,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Error HTTP ${response.status} en ${nombreAccion}`);
        return await response.json();
    } finally {
        clearTimeout(timerId);
    }
};

export const postVenta = (payload) => postToWebhook(N8N_POST_VENTA_URL, payload, 'registrar-venta');
export const postPago = (payload) => postToWebhook(N8N_POST_PAGO_URL, payload, 'registrar-pago');
export const postFacturaUpdate = (payload) => postToWebhook(N8N_POST_FACTURA_URL, payload, 'actualizar-factura');
export const postValeRRHH = (payload) => postToWebhook(N8N_POST_RRHH_URL, payload, 'registrar-vale-rrhh');

/**
 * Envía un archivo de factura (PDF/imagen) a n8n para procesamiento OCR + IA
 */
export const postFacturaUpload = async (file) => {
    if (!N8N_POST_FACTURA_UPLOAD_URL) {
        throw new Error('VITE_N8N_POST_FACTURA_UPLOAD_URL no está configurada en .env');
    }
    const formData = new FormData();
    formData.append('file', file, file.name);
    const response = await fetch(N8N_POST_FACTURA_UPLOAD_URL, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) throw new Error(`Error HTTP ${response.status} al subir factura`);
    return await response.json().catch(() => ({ ok: true }));
};

// ─── CONFIGURACIONES ────────────────────────────────────────────────────────

/**
 * Carga todas las configuraciones desde n8n (07_CONFIG sheet).
 * Retorna: { usuarios, empleados, medios_pago, emails_notificacion, alertas, config_general, parametros_sueldos }
 */
export const fetchConfiguraciones = async () => {
    if (!N8N_CONFIG_GET_URL) throw new Error('VITE_N8N_CONFIG_GET_URL no configurada');
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(N8N_CONFIG_GET_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Token': WEBHOOK_SECRET,
            },
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Error HTTP ${response.status} al cargar configuraciones`);
        return await response.json();
    } finally {
        clearTimeout(timerId);
    }
};

/**
 * Crea o actualiza un usuario en la sheet USUARIOS.
 * payload.action = 'crear' | 'actualizar'
 * payload.password_hash se incluye solo si se cambia la contraseña.
 * SECURITY NOTE: SHA-256 es un hash rápido, no ideal para contraseñas.
 * Se recomienda que n8n aplique un segundo hash bcrypt server-side.
 */
export const postGestionarUsuario = (payload) =>
    postToWebhook(N8N_GESTIONAR_USUARIO_URL, payload, 'gestionar-usuario');

/**
 * Guarda una sección de configuración en la sheet correspondiente.
 * payload = { seccion: 'empleados'|'medios_pago'|'notificaciones'|'general', data: [...] }
 */
export const postGuardarConfiguracion = (seccion, data) =>
    postToWebhook(N8N_GUARDAR_CONFIG_URL, { seccion, data }, `guardar-configuracion/${seccion}`);

/**
 * Guarda edición de un insumo en la sheet COSTOS (02_FACTURAS).
 * Usa endpoint dedicado /webhook/guardar-costos.
 */
export const postGuardarCostos = (payload) =>
    postToWebhook(N8N_GUARDAR_COSTOS_URL, { seccion: 'costos', data: payload }, 'guardar-costos');

// ─── GEMINI ──────────────────────────────────────────────────────────────────

/**
 * Función para llamar a Gemini con el contexto actual provisto por n8n
 */
export const callGeminiWithContext = async (prompt, systemInstruction = "") => {
    if (!GEMINI_API_KEY) {
        return "Falta configurar VITE_GEMINI_API_KEY en tu archivo .env";
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
        try {
            const response = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                })
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta de IA.";
        } catch (error) {
            retries++;
            if (retries === maxRetries) throw error;
            await new Promise(res => setTimeout(res, 1000 * Math.pow(2, retries))); // Backoff exponencial
        }
    }
};
