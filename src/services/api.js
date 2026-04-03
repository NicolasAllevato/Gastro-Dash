// URL del Webhook de n8n desde el archivo .env
const N8N_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const N8N_LOGIN_URL = import.meta.env.VITE_N8N_LOGIN_URL;
// API Key de Gemini desde el archivo .env
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// URL del Webhook de n8n para posteos (movimientos)
const N8N_POST_URL = import.meta.env.VITE_N8N_WEBHOOK_POST_URL;
// URLs de webhooks POST por módulo
const N8N_POST_VENTA_URL = import.meta.env.VITE_N8N_POST_VENTA_URL;
const N8N_POST_PAGO_URL = import.meta.env.VITE_N8N_POST_PAGO_URL;
const N8N_POST_FACTURA_URL = import.meta.env.VITE_N8N_POST_FACTURA_URL;
const N8N_POST_RRHH_URL = import.meta.env.VITE_N8N_POST_RRHH_URL;
const N8N_POST_FACTURA_UPLOAD_URL = import.meta.env.VITE_N8N_POST_FACTURA_UPLOAD_URL;

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
            productos: (raw.costos?.productos || []).filter(p => p.nombre),
        },

        // facturas: filtrar filas fantasma sin id real
        facturas: {
            ...raw.facturas,
            lista: (raw.facturas?.lista || []).filter(f => f.id && String(f.id).trim() !== ''),
        },

        // stock: items pueden llegar sin producto/categoria/unidad/proveedor; filtrar fantasmas
        stock: {
            ...raw.stock,
            inventario: (raw.stock?.inventario || [])
                .map(item => ({
                    producto: '',
                    categoria: '',
                    unidad: '',
                    proveedor: '',
                    ...item,
                }))
                .filter(item => item.producto && item.producto.trim() !== ''),
        },
    };
};

/**
 * Función para obtener los datos de negocio desde n8n
 */
export const fetchBusinessData = async () => {
    if (!N8N_URL) {
        console.warn("VITE_N8N_WEBHOOK_URL no está definida en .env");
        throw new Error('Sin URL de webhook n8n configurada.');
    }

    try {
        const response = await fetch(N8N_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP de n8n: ${response.status}`);
        }

        const data = await response.json();
        return normalizeApiResponse(data);
    } catch (error) {
        console.error("Error al obtener datos de n8n:", error);
        throw error;
    }
};

/**
 * Función para enviar movimientos de stock a n8n
 */
export const postStockMovement = async (movimientoPayload) => {
    if (!N8N_POST_URL) {
        console.warn("VITE_N8N_WEBHOOK_POST_URL no está definida en .env");
        return; // Retornamos temprano temporalmente si no hay webhook configurado para no quebrar la app local
    }

    try {
        const response = await fetch(N8N_POST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movimientoPayload)
        });

        if (!response.ok) {
            throw new Error(`Error HTTP de n8n al intentar postear: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error al postear datos a n8n:", error);
        throw error;
    }
};

/**
 * Función genérica para enviar datos POST a un webhook n8n
 */
const postToWebhook = async (url, payload, nombreAccion) => {
    if (!url) {
        console.warn(`URL no configurada para: ${nombreAccion}`);
        return { ok: false, fallback: true };
    }
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Error HTTP ${response.status} en ${nombreAccion}`);
    return await response.json();
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
