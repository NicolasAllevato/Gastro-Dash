import { useState } from 'react';
import { BookOpen, ChefHat, DollarSign, TrendingUp, ShoppingBasket, Plus, Lock } from 'lucide-react';

const TABS = [
    { id: 'recetas', label: 'Recetas', icon: ChefHat },
    { id: 'precios', label: 'Cambios de Precio', icon: TrendingUp },
    { id: 'costos', label: 'Costos de Receta', icon: DollarSign },
    { id: 'ventas', label: 'Productos Vendidos', icon: ShoppingBasket },
];

function PlaceholderSection({ icon: Icon, titulo, descripcion }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20 flex items-center justify-center">
                <Icon size={36} className="text-[var(--color-gold)]/40" />
            </div>
            <div>
                <p className="text-white font-black text-lg mb-2 flex items-center justify-center gap-2">
                    <Lock size={16} className="text-[var(--color-gold)]/50" /> Próximamente
                </p>
                <p className="text-gray-500 text-sm font-bold max-w-md leading-relaxed">{descripcion}</p>
            </div>
            <button
                disabled
                className="flex items-center gap-2 border border-[var(--color-gold)]/30 text-[var(--color-gold)]/40 px-5 py-2 text-[11px] font-black uppercase tracking-widest cursor-not-allowed"
            >
                <Plus size={13} /> {titulo}
            </button>
        </div>
    );
}

export default function RecetarioDashboard({ data }) {
    const [tab, setTab] = useState('recetas');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center gap-4 border-b border-[var(--color-obsidian-border)] pb-5">
                <div className="p-3 bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] rounded-full">
                    <BookOpen size={24} className="text-[var(--color-gold)]" />
                </div>
                <div>
                    <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-widest text-white">Recetario</h2>
                    <p className="text-gray-500 text-xs mt-0.5 uppercase tracking-widest font-bold">Gestión de recetas · Costos · Rentabilidad</p>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="bg-[#111111] p-1 border border-[var(--color-obsidian-border)] flex flex-wrap gap-0.5 w-fit">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${tab === id ? 'bg-[var(--color-gold)] text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Icon size={13} /> {label}
                    </button>
                ))}
            </div>

            {/* Contenido por tab */}
            <div className="glass-panel overflow-hidden border border-[var(--color-obsidian-border)]">

                {tab === 'recetas' && (
                    <PlaceholderSection
                        icon={ChefHat}
                        titulo="Nueva Receta"
                        descripcion="Cargá tus recetas con ingredientes, cantidades y unidades. Cada receta calculará automáticamente su costo en base al precio de los insumos del stock."
                    />
                )}

                {tab === 'precios' && (
                    <PlaceholderSection
                        icon={TrendingUp}
                        titulo="Registrar Cambio de Precio"
                        descripcion="Registrá las variaciones de precio de los insumos para rastrear el impacto en los costos de cada receta a lo largo del tiempo."
                    />
                )}

                {tab === 'costos' && (
                    <PlaceholderSection
                        icon={DollarSign}
                        titulo="Calcular Costo"
                        descripcion="Visualizá el costo por plato, el margen de ganancia sugerido y comparalo contra el precio de venta actual para detectar recetas deficitarias."
                    />
                )}

                {tab === 'ventas' && (
                    <PlaceholderSection
                        icon={ShoppingBasket}
                        titulo="Cargar Productos Vendidos"
                        descripcion="Ingresá los platos vendidos en cada turno para que el sistema descuente automáticamente los insumos usados y recalcule el CMV del período."
                    />
                )}
            </div>
        </div>
    );
}
