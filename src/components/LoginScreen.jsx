import { useState } from 'react';
import { Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function LoginScreen() {
    const { login, loggingIn, loginError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(email, password);
    };

    return (
        <div className="min-h-screen bg-[var(--color-obsidian)] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                {/* Logo / título */}
                <div className="text-center mb-10">
                    <h1 className="font-serif font-black text-3xl text-white tracking-widest uppercase">Gastro Dash</h1>
                    <p className="text-[var(--color-gold)] text-[11px] font-black uppercase tracking-[0.3em] mt-1">Panel de Gestión</p>
                </div>

                <form onSubmit={handleSubmit} className="glass-panel border border-[var(--color-obsidian-border)] p-8 space-y-5 shadow-2xl">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email</label>
                        <div className="relative">
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="usuario@restaurante.com"
                                className="w-full bg-black/40 border border-[var(--color-obsidian-border)] text-white text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-[var(--color-gold)] placeholder:text-gray-600 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Contraseña</label>
                        <div className="relative">
                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="password"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-black/40 border border-[var(--color-obsidian-border)] text-white text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-[var(--color-gold)] placeholder:text-gray-600 transition-colors"
                            />
                        </div>
                    </div>

                    {loginError && (
                        <p className="text-[var(--color-signal)] text-[11px] font-bold border border-[var(--color-signal)]/30 bg-[var(--color-signal)]/10 px-3 py-2">
                            {loginError}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loggingIn}
                        className="w-full bg-[var(--color-gold)] text-black font-black text-[11px] uppercase tracking-widest py-3 hover:bg-[var(--color-gold-hover)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loggingIn ? <><Loader2 size={14} className="animate-spin" /> Verificando...</> : 'Ingresar'}
                    </button>
                </form>

                <p className="text-center text-gray-600 text-[10px] mt-6">
                    Acceso restringido — Sistema de gestión gastronómica
                </p>
            </div>
        </div>
    );
}
