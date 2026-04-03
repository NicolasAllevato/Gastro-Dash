# CLAUDE.md — Gastro Dash

> Contexto completo del proyecto para Claude Code. Leer entero antes de trabajar en cualquier componente.

---

## Visión del proyecto

**Gastro Dash** es un dashboard de gestión gastronómica para restaurantes. Permite visualizar y operar compras, ventas, stock, RRHH, costos, pagos y facturación desde una interfaz web oscura y moderna.

El sistema tiene **dos capas:**
1. **Frontend:** App React local (sin backend propio)
2. **Automatización:** n8n como motor de datos + Google Sheets como base de datos

---

## Stack tecnológico

### Frontend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| React | 19 | UI principal |
| Vite | 7 | Build tool |
| Tailwind CSS | 4 | Estilos (tema oscuro, gold accents) |
| Recharts | 3 | Gráficos (pie, line, bar) |
| Lucide React | 0.575 | Iconos |
| XLSX | 0.18 | Exportación Excel |

### Backend / Automatización
| Tecnología | Uso |
|-----------|-----|
| n8n (self-hosted en EasyPanel) | Motor de automatización y webhooks |
| Google Sheets | Base de datos principal |
| Google Drive | Almacenamiento de facturas |
| LlamaIndex Cloud | OCR de facturas (PDF/imagen) |
| OpenAI GPT-4o-mini / GPT-4o | Clasificación, extracción y normalización IA |
| Gemini 2.0 Flash | Chat IA dentro de la app (GastroIA Assist) |
| Telegram | Notificaciones operativas |

---

## Arquitectura de datos

```
Usuario sube factura (Drive o Web)
        ↓
n8n — Workflow ingesta (ID: 6goDpn3iO5HRY6iN)
        ↓
Google Sheets — RESTAURANTE_GESTION_DB
        ↓
n8n — Workflow GET (pendiente de crear)
        ↓
Frontend Gastro Dash (React)
```

### Flujo de comunicación frontend ↔ n8n

| Variable .env | URL | Función |
|--------------|-----|---------|
| `VITE_N8N_WEBHOOK_URL` | `/webhook-test/2e9dd626...` | GET datos para toda la app |
| `VITE_N8N_POST_FACTURA_UPLOAD_URL` | `/webhook/subir-factura` | POST archivo factura desde web |
| `VITE_N8N_POST_FACTURA_URL` | `/webhook/actualizar-factura` | POST marcar factura como pagada |
| `VITE_N8N_POST_VENTA_URL` | `/webhook/registrar-venta` | POST nueva venta |
| `VITE_N8N_POST_PAGO_URL` | `/webhook/registrar-pago` | POST nuevo pago |
| `VITE_N8N_POST_RRHH_URL` | `/webhook/registrar-vale-rrhh` | POST vale RRHH |
| `VITE_N8N_WEBHOOK_POST_URL` | `/webhook-test/post-stock-movement` | POST movimiento de stock |
| `VITE_GEMINI_API_KEY` | — | Chat IA interno |

**n8n base URL:** `https://n9n-n8n.n7v9de.easypanel.host`

---

## Google Sheets — RESTAURANTE_GESTION_DB

**Spreadsheet ID:** `1X9y1w5hodC_FAnIVqleCUiffFBq8zLqKsh60Ydcgu6A`

| Tab / GID | Nombre | Contenido | GID |
|-----------|--------|-----------|-----|
| `COSTOS` | Maestro de costos | Catálogo de insumos con precios | `2128411592` |
| `COMPRAS` | Compras | Ítems de compra por línea | `0` |
| `PRODUCTOS` | Stock / Productos | Lista de productos para inventario ✅ | `592691218` |
| `PROVEEDORES` | Proveedores | Datos maestros de proveedores | `1365882757` |
| `FACTURAS_PROCESADAS` | Facturas procesadas | Registro de facturas ingestadas | `1547654691` |
| `LOGS` | Logs | Errores y eventos del sistema | `174514083` |
| `CONFIG` | Configuración | Parámetros generales | `1716059685` |

**Columnas confirmadas PRODUCTOS** (vía gws 2026-04-02):
`codigo_producto | producto | categoria | unidad_base | stock_actual | stock_minimo | proveedor_default | precio_referencia | created_at | updated_at`

---

## Google Sheets — 02_DATABASE (nueva arquitectura)

> El spreadsheet `RESTAURANTE_GESTION_DB` sigue activo mientras se migra n8n.
> Los 8 archivos nuevos están en `02_DATABASE/` con tabs y headers ya creados.

| Archivo | Spreadsheet ID | Tabs |
|---------|---------------|------|
| `01_INVENTARIO` | `1GuZ_6R86wNEvC5znQJPJ3d8yZ208g5w-HYoedG7SAXw` | INVENTARIO · STOCK · MERMAS · PRODUCTOS · CATEGORIAS · PLANTILLA_CONTEO |
| `02_FACTURAS` | `18mFE6Uv4tR_vIYQcqA40a1NwhSIRYj1Xqh975a8a7TU` | COMPRAS · COSTOS · FACTURAS_PROCESADAS · LOGS |
| `03_VENTAS` | `1hE084LGAcvrU4iYWg-dVLHD6GoX44B-s6RqfMCpJeUg` | VENTAS · TURNOS · CANALES |
| `04_PROVEEDORES` | `1AkIaO89tC4TSPjyn7Z0UiCtw-2K9OxufglVe0MSGBqo` | PROVEEDORES · ESTADO_CUENTA |
| `05_PAGOS_PROVEEDORES` | `14aAA5v2JWEcgals68_8Ekaf9Vyp7W7LvSYG8O-vNPps` | PAGOS · PAGOS_PROVEEDORES |
| `06_PAGOS_EMPLEADOS` | `1WFdyfLCYceI_cwXa1bilU1Gt1qyDgqUrFSLPyUfxBA4` | PAGOS_EMPLEADOS · VALES · CALCULO_SUELDOS · HORAS_EXTRAS · COMISIONES |
| `07_CONFIG` | `1kGUVVj_DoW8FylHDjDk0wsgS8aAdcjXV_hJ5amAQOws` | CONFIG · MEDIOS_PAGO · EMPLEADOS · PARAMETROS_SUELDOS · EMAILS_NOTIFICACION · ALERTAS_CONFIG |
| `08_DASHBOARD` | `1PJO51Z762TPflvw0V7tiQkQ6r3MhKrLdJJPKxy1j780` | DASHBOARD · RESUMEN · KPIS |

**Nota para n8n:** Al migrar el workflow, usar los IDs de `02_FACTURAS` para COMPRAS, COSTOS, FACTURAS_PROCESADAS y LOGS.

**Migración de datos — COMPLETA (2026-04-02):**
| Tab | Filas migradas | Destino |
|-----|---------------|---------|
| COSTOS | 225 | 02_FACTURAS → COSTOS |
| COMPRAS | 10 | 02_FACTURAS → COMPRAS |
| LOGS | 17 | 02_FACTURAS → LOGS |
| FACTURAS_PROCESADAS | 0 (vacío) | 02_FACTURAS → FACTURAS_PROCESADAS |
| PROVEEDORES | 0 (vacío) | 04_PROVEEDORES → PROVEEDORES |
| PRODUCTOS | 0 (vacío) | 01_INVENTARIO → PRODUCTOS |

Script de migración: `migrate_gastro.py` (Git Bash: `C:/Program Files/Git/bin/bash.exe`)

### Estructura de datos que espera el frontend

```javascript
// data.compras (ComprasDashboard)
{
  kpis: { totales, porcentaje, promedio, porPagar, pagado },
  porCategoria: [{ name, value }],       // pie chart
  tendencia: [{ name, value }],          // line chart
  rankingDeuda: [{ proveedor, monto }],
  facturas: [{ id, categoria, proveedor, vencimiento, total, estado }]
}

// data.facturas (FacturasDashboard) — campos DISTINTOS a compras.facturas
{
  kpis: { vencida, aVencer, pagado, cant },
  lista: [{ id, proveedor, cat, ven, monto, estado }]
}

// data.costos (Control Costos)
{
  kpis: { mayorAumento: { variacion, producto }, mayorGasto: { monto, producto }, itemsAumento },
  productos: [{ nombre, ant, act, var }]  // variación de precios
}

// data.stock
{
  kpis: { valorInventario, mermasTotales, alertasCriticas, cmvMensual },
  inventario: [{ id, categoria, producto, unidad, stockInicial, compras, stockFinal, merma, precioUnitario, proveedor }],
  cmvHistorial: [{ mes, cmv }],
  movimientos: [{ id, fecha, responsable, tipo, producto, cantidad, motivo }]
}
```

---

## Google Drive — Estructura de carpetas

| Carpeta | ID | Propósito |
|---------|-----|-----------|
| `01-Carga de datos/Facturas_Subir/` | `19MF0uyRPfsrWzBH6aBctkFkIcb5ohzds` | Trigger: archivos subidos aquí activan el workflow |
| `📂 99_PROCESADOS/Facturas/` | `1XNw40tPBU3OA1g9TsPdT-mnbzvgOQxmw` | Destino de archivos procesados exitosamente ✅ |
| `ERRORES/Facturas/` | `1CjtiS7bu8lkZBvK4c_XOw-Vq4tLwlIzk` | Archivos rechazados (tipo inválido, OCR fail) ✅ |

**Estructura real confirmada y configurada vía gws (2026-04-02):**

```
RESTAURANTE_GESTION/ (ID: 1_AeQtEZJhCXtNP7yAH0jiSvWHf5m0jc0)
├── 01_INPUT/ (ID: 1rmPSYI1UMqHSXlbyrk0lfUgIDywsq5lK)
│   ├── Facturas_Subir/  ID: 19MF0uyRPfsrWzBH6aBctkFkIcb5ohzds  ← n8n trigger
│   ├── Ventas_Subir/    ID: 1X1tbyTEW6bZ4xHGiiRHHAK_XoFlS2B3V
│   ├── Pagos_Subir/     ID: 11UIOQsQd4F60D5-qGM6syq8SEJ1_BjjP
│   └── Vales_Subir/     ID: 1Ni-EZqeaDXO0-Je8aVKU2VK3IxPJ0yaC
├── 02_DATABASE/ (ID: 1ESa0SZX3xaXR5rG_ShbX7kC48QOr18Ce)
│   ├── 01_INVENTARIO    ID: 1GuZ_6R86wNEvC5znQJPJ3d8yZ208g5w-HYoedG7SAXw
│   ├── 02_FACTURAS      ID: 18mFE6Uv4tR_vIYQcqA40a1NwhSIRYj1Xqh975a8a7TU
│   ├── 03_VENTAS        ID: 1hE084LGAcvrU4iYWg-dVLHD6GoX44B-s6RqfMCpJeUg
│   ├── 04_PROVEEDORES   ID: 1AkIaO89tC4TSPjyn7Z0UiCtw-2K9OxufglVe0MSGBqo
│   ├── 05_PAGOS_PROVEEDORES  ID: 14aAA5v2JWEcgals68_8Ekaf9Vyp7W7LvSYG8O-vNPps
│   ├── 06_PAGOS_EMPLEADOS    ID: 1WFdyfLCYceI_cwXa1bilU1Gt1qyDgqUrFSLPyUfxBA4
│   ├── 07_CONFIG        ID: 1kGUVVj_DoW8FylHDjDk0wsgS8aAdcjXV_hJ5amAQOws
│   └── 08_DASHBOARD     ID: 1PJO51Z762TPflvw0V7tiQkQ6r3MhKrLdJJPKxy1j780
├── ERRORES/ (ID: 1HKMPjzZemoCVvQn3VXJ8jmDes8IzipaP)
│   ├── Facturas/  ID: 1CjtiS7bu8lkZBvK4c_XOw-Vq4tLwlIzk
│   ├── Ventas/    ID: 1EfDR1MafYg9Y94DCYzqYX5Ts7GvV-XAr
│   ├── Pagos/     ID: 1Lrmo8A_v4hTgZNRee-OpAda2yNOJWi8K
│   └── Vales/     ID: 1__262bew2ZswmiOiS54tXm5O6JKlamrS
├── 📂 99_PROCESADOS/ (ID: 1Cq3SieYXIvM_XH-g1aNgkMKXtmfegCri)
│   ├── Facturas/  ID: 1XNw40tPBU3OA1g9TsPdT-mnbzvgOQxmw  ← destino facturas OK
│   ├── Pagos/     ID: 1HalZigQ-DOkY-DBPVdE8-6eXVU8nUFZN
│   ├── Ventas/    ID: 1tWag-Muxwy-Qj5o3tuAuv57ynx4XlB6S
│   └── Vales/     ID: 1nOR7ohLsD4IQKEh1gjFSf1iJOSMZpyKT
├── 📂 03_REPORTES/ (ID: 1MV64vCdegVdVMgP-YyVQuYBTWW2yQfHP)
│   ├── Diarios/    ID: 1nM_79dI66EUvl335fDKnjoZPQfABPTEL
│   ├── Semanales/  ID: 1ZKfRq10jYVFWbIx5IcKYefSX6P3mzNBf
│   ├── Mensuales/  ID: 1-afYMVncE-sGZaiuYS6oXShag7pLz7xX
│   └── Alertas/    ID: 1CnR8sVi7zlyIpMhdvkvoc2gtBo5JT5q-
└── 04_Backups/ (ID: 1yBYEEvYXwuOBx2GfXcQd_fOhi_kId2gy)
    └── Historial/  ID: 1gmfq_RkUgkfzY35kvOi-vk692KfBguSP
```

---

## N8N — Workflow principal de ingesta

**Workflow ID:** `6goDpn3iO5HRY6iN`
**Nombre:** Demo gastro-Dash
**Estado:** Activo = false (demo)
**Nodos totales:** 64

### Módulos del workflow

```
ENTRADA
├── Drive Trigger (GD_TRG_SUBIR_DOCUMENTOS) — polling cada minuto en Facturas_Subir/
└── [WEB - pendiente] Webhook POST /subir-factura

VALIDACIÓN (solo path Drive)
├── Loop de archivos
├── SET_Contexto: file_id, file_name, mime, run_id, link, md5_drive
└── SI_Aceptar_archivo: filtra PDF/JPG/PNG → rechaza otros

OCR — LlamaIndex Cloud
├── LP_Normalizador: normaliza binary (fileName + mimeType)
├── LP_Subir_Documento: POST multipart a api.cloud.llamaindex.ai
├── LP_Check_Status: polling GET /job/{id}
├── Esta_listo?: switch (listo/esperando)
├── Wait: reintento
└── LP_Obtener_datos: GET /job/{id}/result/markdown → SET_OCR_DOCUMENTO

AI PIPELINE — OpenAI
├── Agente_Clasificador (gpt-4o-mini): identifica tipo de documento
├── Sw_Clasificador: switch por categoría (solo "compras" conectado hoy)
├── Agente_Extractor_Compras (gpt-4o-mini → UPGRADE a gpt-4o): extrae ítems
├── Agente_Normalizador_Items (gpt-4o-mini → UPGRADE a gpt-4o): match vs COSTOS
└── Agente_Normalizador_FALSE (gpt-4o-mini → UPGRADE a gpt-4o): segundo intento

ESCRITURA
├── COMPRAS: ítems de línea (Agregar a compras)
├── FACTURAS_PROCESADAS: registro por factura
├── COSTOS: productos nuevos detectados
├── LOGS: errores e incidencias

NOTIFICACIONES
├── Telegram chat ID: 6543692606
└── Gmail: draft (errores)
```

### LLM credentials en uso
- **LlamaIndex:** `Bearer llx-7o74dvEV6k8dFxACL0dZ1aBBNKeGaiuxBkKy3vBOJxXYtBKV`
- **OpenAI:** configurado en credenciales n8n (no expuesto en parámetros)

---

## Estado actual de implementación

### ✅ Completado

**Frontend:**
- Todos los módulos del dashboard (ResumenDashboard, VentasDashboard, ComprasDashboard, StockDashboard, PagosDashboard, FacturasDashboard, RRHHDashboard, RecetarioDashboard)
- Zona de carga de facturas en ComprasDashboard (drag & drop, PDF/JPG/PNG)
- `postFacturaUpload()` en api.js (multipart/form-data)
- Variable `.env` `VITE_N8N_POST_FACTURA_UPLOAD_URL`
- Chat flotante Gemini (GastroIA Assist)
- Sistema de toasts y notificaciones

**N8N:**
- Trigger Drive + loop de archivos
- Pipeline OCR completo (LlamaIndex)
- Agente clasificador + switch
- Agente extractor de compras
- Agente normalizador (primer intento)
- Agente normalizador FALSE (segundo intento)
- Escritura en COMPRAS (path TRUE)
- Logs en LOGS sheet
- Telegram para duplicados
- Detección de productos nuevos (PREP_Alta_Producto_Nuevo)

### ✅ Implementado (2026-04-03)

**N8N workflow actualizado — 64 → 84 nodos:**

| Tarea | Estado |
|-------|--------|
| 4 modelos OpenAI → gpt-4o | ✅ |
| Dead ends eliminados (AGREGAR_MATCHS_FINALES, UNIR_MATCHS_FINAL_INPUT) | ✅ |
| FALSE path conectado: SET_JOIN_KEY → Code_Prep_FALSE_Compras → GS_COMPRAS_FALSE + GS_02FACTURAS_COMPRAS_FALSE | ✅ |
| Dual-write TRUE path: Agregar a compras → GS_02FACTURAS_COMPRAS_TRUE | ✅ |
| PREP_Alta_Producto_Nuevo → 4 writes paralelos (COSTOS, PRODUCTOS, COMPRAS, LOGS) + TG_Producto_Nuevo | ✅ |
| Cierre exitoso: Prep_FACTURAS_PROCESADAS → GS × 2 → GD_Mover_a_Procesadas → TG_Factura_OK | ✅ |
| Notificaciones: TG_Error_OCR (after OCR fail), TG_Factura_OK, TG_Producto_Nuevo | ✅ |
| Webhook web: WH_Subir_Factura → WH_Preparar_Contexto → WH_Respuesta_OK + LP_Normalizador | ✅ |
| Switch cases conectados: SERVICIOS/RRHH/PAGOS/OTROS → TG Manual (notificación temporal) | ✅ |
| Renombres: TRIGGER_MANUAL, LP_Check_Status, UNIR_FALSE_Y_MAESTRO × 2 | ✅ |

### ⚠️ Pendiente

| Tarea | Prioridad |
|-------|-----------|
| M9: Reescribir prompts de los 4 agentes IA | 🟡 media |
| M10: Botones "Plantilla Vale" y "Cargar Vale" en FacturasDashboard | 🟡 media |
| M11: Crear workflow GET n8n (lee 02_DATABASE → JSON para frontend) | 🔴 alta |
| M12: Verificación frontend con datos reales | ✅ completado |
| SERVICIOS: pipeline completo (hoy es TG manual) | 🟢 baja |
| RRHH: extractor de vales completo (hoy es TG manual) | 🟢 baja |
| PAGOS/OTROS: Telegram inline keyboard para confirmación humana | 🟢 baja |

**N8N — Workflow GET (no existe aún):**
- Leer todas las Sheets y armar el JSON que espera el frontend
- Responder al `VITE_N8N_WEBHOOK_URL` con la estructura de datos completa

---

## Decisiones de diseño tomadas

| # | Decisión | Resolución | Razón |
|---|----------|------------|-------|
| D1 | Fan-out condicional | Dos paths independientes a COMPRAS | Evita merge colgado en n8n |
| D2 | Producto nuevo | Escribe en COSTOS + PRODUCTOS + COMPRAS + LOGS | Registra en maestro, stock, compra y auditoría |
| D3 | Check duplicado pre-OCR | Eliminar (dead code) | nro_factura no existe antes del OCR |
| D4 | Nodo "Replace Me" | Renombrar a TRIGGER_MANUAL | Útil para pruebas manuales |
| D5 | Ruta web vs Drive | Web va directo al OCR (sin loop ni check de tipo) | Frontend ya valida tipo y tamaño |
| D6 | Respuesta webhook | Inmediata (async) | OCR tarda 1-2 min, no se puede esperar |
| D7 | Telegram | Éxito + errores (no ruido de cada producto) | Balance entre información y spam |
| D8 | Cierre exitoso | Registra en FACTURAS_PROCESADAS + mueve Drive | Auditoría + orden en Drive |

---

## Preguntas pendientes de confirmar

1. **PRODUCTOS sheet:** ¿Existe en el spreadsheet? ¿Con qué columnas?
2. **Carpeta Errores Drive:** ¿Querés que los archivos rechazados vayan a una carpeta específica?
3. **Producto nuevo en COMPRAS:** Cuando un producto nuevo se detecta, ¿entra a COMPRAS con precio/cantidad estimados o solo como registro de detección?
4. **Workflow GET:** ¿Cuándo queremos armar el workflow que le responde al frontend con los datos de todas las hojas?

---

## Módulos del frontend

| Módulo | Componente | Datos de n8n |
|--------|-----------|--------------|
| Resumen | `ResumenDashboard.jsx` | `data.resumen` |
| Ventas | `VentasDashboard.jsx` | `data.ventas` |
| Compras | `ComprasDashboard.jsx` | `data.compras` |
| Stock | `StockDashboard.jsx` | `data.stock` |
| RRHH | `RRHHDashboard.jsx` | `data.rrhh` |
| Control Costos | `App.jsx` (inline) | `data.costos` |
| Control Pagos | `PagosDashboard.jsx` | `data.pagos` |
| Facturas | `FacturasDashboard.jsx` | `data.facturas` |
| Recetario | `RecetarioDashboard.jsx` | `data.recetario` |

---

## Cómo levantar el proyecto localmente

```bash
cd "C:\Users\Jesica Echeverria\Desktop\Configuracion Agentes Antigravity\Paginas web\gastro-dash"
npm run dev
# O doble click en run_gastro_dash.bat
```

---

## Ubicaciones clave

| Recurso | Ruta |
|---------|------|
| Proyecto frontend | `Desktop/Configuracion Agentes Antigravity/Paginas web/gastro-dash/` |
| Workflows n8n (JSON) | `Desktop/Configuracion Agentes Antigravity/N8N Workflows/` |
| n8n UI | `https://n9n-n8n.n7v9de.easypanel.host` |
| Workflow ingesta | ID: `6goDpn3iO5HRY6iN` |
| Spreadsheet DB | ID: `1X9y1w5hodC_FAnIVqleCUiffFBq8zLqKsh60Ydcgu6A` |
| Drive Facturas_Subir/ | ID: `19MF0uyRPfsrWzBH6aBctkFkIcb5ohzds` |
| Drive Procesadas/ | ID: `1CjtiS7bu8lkZBvK4c_XOw-Vq4tLwlIzk` |
