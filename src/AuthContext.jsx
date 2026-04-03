import { createContext, useContext, useState, useCallback } from 'react';
import { postLogin } from './services/api';

const SESSION_KEY = 'gastro_session';

const AuthContext = createContext(null);

function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(loadSession);
    const [loginError, setLoginError] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);

    const login = useCallback(async (email, password) => {
        setLoggingIn(true);
        setLoginError('');
        try {
            const result = await postLogin(email, password);
            if (result.ok && result.user) {
                const session = {
                    ...result.user,
                    modulos: result.user.modulos_acceso?.split(',').map(m => m.trim()).filter(Boolean) ?? [],
                    editables: result.user.puede_editar?.split(',').map(m => m.trim()).filter(Boolean) ?? [],
                };
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
                setUser(session);
                return true;
            }
            setLoginError(result.mensaje || 'Credenciales incorrectas.');
            return false;
        } catch {
            setLoginError('No se pudo conectar con el servidor. Verificá tu conexión.');
            return false;
        } finally {
            setLoggingIn(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
    }, []);

    const puedeVer = useCallback((modulo) => {
        if (!user) return false;
        if (user.rol === 'admin') return true;
        return user.modulos?.includes(modulo) ?? false;
    }, [user]);

    const puedeEditar = useCallback((modulo) => {
        if (!user) return false;
        if (user.rol === 'admin') return true;
        return user.editables?.includes(modulo) ?? false;
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, loggingIn, loginError, puedeVer, puedeEditar }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
}
