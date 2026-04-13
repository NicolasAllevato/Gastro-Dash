import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { fetchBusinessData } from './services/api';
import { useToast } from './components/ToastNotification';

const AppContext = createContext(null);

export function AppProvider({ children, initialData }) {
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const hoyStr = hoy.toISOString().split('T')[0];
    const [filtros, setFiltros] = useState({ desde: primerDiaMes, hasta: hoyStr });
    const hasLoadedOnce = useRef(false);
    const filtrosRef = useRef(filtros);
    const { toasts, showToast, removeToast } = useToast();

    const refreshData = useCallback(async (nuevosFiltros) => {
        const filtrosActivos = nuevosFiltros !== undefined ? nuevosFiltros : filtrosRef.current;
        if (nuevosFiltros !== undefined) {
            filtrosRef.current = nuevosFiltros;
            setFiltros(nuevosFiltros);
        }

        if (hasLoadedOnce.current) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const fetchedData = await fetchBusinessData(filtrosActivos);
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
            hasLoadedOnce.current = true;
        } catch {
            showToast('No se pudo conectar con el servidor. Mostrando datos locales.', 'warning');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [showToast]);

    return (
        <AppContext.Provider value={{ data, setData, isLoading, isRefreshing, filtros, refreshData, showToast, toasts, removeToast }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext debe usarse dentro de AppProvider');
    return ctx;
}
