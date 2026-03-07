// URL del Webhook de n8n desde el archivo .env
const N8N_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
// API Key de Gemini desde el archivo .env
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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
        return data;
    } catch (error) {
        console.error("Error al obtener datos de n8n:", error);
        throw error;
    }
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
