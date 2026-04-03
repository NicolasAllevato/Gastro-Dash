import { useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

// ── Hook exportable ──────────────────────────────────────────────────────────
export function useToast() {
    const [toasts, setToasts] = useState([]);
    const timerRef = useRef({});

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => {
            const next = [...prev, { id, message, type }];
            return next.length > 4 ? next.slice(next.length - 4) : next;
        });
        timerRef.current[id] = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
            delete timerRef.current[id];
        }, 3500);
    }, []);

    const removeToast = useCallback((id) => {
        clearTimeout(timerRef.current[id]);
        delete timerRef.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
}

// ── Íconos y colores por tipo ────────────────────────────────────────────────
const CONFIG = {
    success: {
        icon: CheckCircle,
        border: 'border-[var(--color-acid)]',
        iconColor: 'text-[var(--color-acid)]',
        bg: 'bg-[#0a0a0a]',
    },
    error: {
        icon: XCircle,
        border: 'border-[var(--color-signal)]',
        iconColor: 'text-[var(--color-signal)]',
        bg: 'bg-[#0a0a0a]',
    },
    warning: {
        icon: AlertTriangle,
        border: 'border-[var(--color-gold)]',
        iconColor: 'text-[var(--color-gold)]',
        bg: 'bg-[#0a0a0a]',
    },
};

// ── Contenedor de toasts ─────────────────────────────────────────────────────
export function ToastContainer({ toasts, removeToast }) {
    if (!toasts || toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => {
                const cfg = CONFIG[toast.type] || CONFIG.success;
                const Icon = cfg.icon;
                return (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg
                            border ${cfg.border} ${cfg.bg}
                            shadow-xl min-w-[260px] max-w-[360px]
                            animate-[slideInRight_0.25s_ease-out]
                        `}
                        style={{ backdropFilter: 'blur(12px)' }}
                    >
                        <Icon size={18} className={cfg.iconColor + ' shrink-0'} />
                        <span className="text-white text-sm flex-1 leading-snug">{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-white/40 hover:text-white/80 transition-colors ml-1 shrink-0"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
