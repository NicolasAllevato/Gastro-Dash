import { createContext, useContext, useState, useCallback } from 'react';
import { fetchBusinessData } from './services/api';
import { useToast } from './components/ToastNotification';

const AppContext = createContext(null);

export function AppProvider({ children, initialData }) {
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedData = await fetchBusinessData();
            if (fetchedData && typeof fetchedData === 'object') {
                setData(prev => {
                    const merged = { ...prev };
                    Object.keys(fetchedData).forEach(modulo => {
                        if (merged[modulo] !== undefined) {
                            merged[modulo] = { ...prev[modulo], ...fetchedData[modulo] };
                        }
                    });
                    return merged;
                });
            }
        } catch {
            showToast('No se pudo conectar con el servidor. Mostrando datos locales.', 'warning');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    return (
        <AppContext.Provider value={{ data, setData, isLoading, refreshData, showToast, toasts, removeToast }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext debe usarse dentro de AppProvider');
    return ctx;
}
