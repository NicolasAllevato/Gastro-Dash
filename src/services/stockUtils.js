import * as XLSX from 'xlsx';

/**
 * Calcula el Uso de mercadería
 * Uso = Stock Inicial + Compras - Stock Final
 */
export const calculateUsage = (stockInicial, compras, stockFinal) => {
  return Number(stockInicial) + Number(compras) - Number(stockFinal);
};

/**
 * Calcula el Costo por Uso
 * Costo por Uso = Uso * Precio Unitario
 */
export const calculateCostPerUse = (uso, precioUnitario) => {
  return Number(uso) * Number(precioUnitario);
};

/**
 * Calcula el Total de Merma
 * Total Merma = Merma * Precio Unitario
 */
export const calculateWasteTotal = (merma, precioUnitario) => {
  return Number(merma) * Number(precioUnitario);
};

/**
 * Formatea valor a Pesos Argentinos (ARS)
 */
export const formatPesos = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '$ 0';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num);
};

/**
 * Importa archivo Excel (.xlsx) y devuelve array de objetos
 */
export const parseExcelToJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Asumiendo que leemos la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertimos a JSON usando los encabezados de la primera fila
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (error) {
        reject("Error al procesar el archivo Excel: " + error.message);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Exporta array de objetos a archivo Excel (.xlsx) y fuerza la descarga
 */
export const exportJSONToExcel = (data, fileName = "Reporte_Stock.xlsx") => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    
    // Genera buffer y fuerza descarga
    XLSX.writeFile(workbook, fileName);
    return true;
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    return false;
  }
};
