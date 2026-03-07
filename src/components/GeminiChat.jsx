import React, { useState, useEffect, useRef } from 'react';
import { callGeminiWithContext } from '../services/api';
import { Sparkles, X, Send, Loader2, Bot } from 'lucide-react';

export default function GeminiChat({ data }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy GastroIA. Analizo en tiempo real los datos de tu negocio. ¿En qué puedo asesorarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    const systemInstruction = "Eres un consultor gastronómico experto. Ayudas a analizar los datos actuales del restaurante. Eres empático, directo y das respuestas cortas, en español latino. Tu base para responder es el contexto que te pasamos, utilízalo para contestar a la pregunta del usuario.";
    // Avoid sending huge payload by stringifying what's most relevant
    const contextPrompt = `Contexto del negocio (JSON): ${JSON.stringify(data)}\n\nHistorial de mensajes:\n${messages.slice(-5).map(m => m.role + ': ' + m.text).join('\n')}\n\nUsuario: ${userMessage}`;

    try {
      const response = await callGeminiWithContext(contextPrompt, systemInstruction);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Disculpa, ocurrió un error al consultar con el servidor. Intenta nuevamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-tr from-[var(--color-obsidian)] to-[var(--color-gold)] text-white p-4 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-110 transition-all z-50 flex items-center justify-center animate-bounce group border border-[var(--color-gold)]"
      >
        <Sparkles size={28} className="group-hover:rotate-12 transition-transform drop-shadow text-[#0a0a0a]" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[340px] sm:w-[400px] h-[550px] bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="bg-[var(--color-obsidian-light)] border-b border-[var(--color-obsidian-border)] p-4 flex justify-between items-center px-5 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-[var(--color-gold)]/10 p-2.5 rounded-xl border border-[var(--color-gold)]/30">
            <Bot size={22} className="text-[var(--color-gold)] drop-shadow-md" />
          </div>
          <div>
            <span className="font-black text-white tracking-widest text-sm uppercase block">Gastro IA</span>
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></span> Online</span>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded-lg hover:bg-white/10">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 w-full p-5 overflow-y-auto flex flex-col space-y-5 bg-gradient-to-b from-[var(--color-obsidian)] to-[var(--color-obsidian-light)]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[1.25rem] p-4 text-sm shadow-xl ${
              msg.role === 'user' 
                ? 'bg-[var(--color-gold)] text-black rounded-tr-sm font-semibold' 
                : 'bg-white/5 border border-[var(--color-obsidian-border)] text-gray-200 rounded-tl-sm'
            }`}>
              {msg.text.split('\n').map((line, i) => <p key={i} className={i !== 0 ? "mt-2" : ""}>{line}</p>)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-[var(--color-obsidian-border)] rounded-[1.25rem] rounded-tl-sm p-4 flex items-center space-x-3 shadow-xl">
              <Loader2 size={16} className="animate-spin text-[var(--color-gold)]" />
              <span className="text-xs text-gray-400 font-bold tracking-widest uppercase">Analizando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 bg-[var(--color-obsidian-light)] border-t border-[var(--color-obsidian-border)] flex items-center space-x-3 shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu consulta..."
          className="flex-1 bg-[var(--color-obsidian)] border border-[var(--color-obsidian-border)] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors placeholder:text-gray-600 font-semibold shadow-inner"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isLoading}
          className="bg-[var(--color-gold)] text-black p-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-goldHover)] hover:-translate-y-1 hover:shadow-lg transition-all relative flex items-center justify-center"
        >
           <Send size={20} className={`${isLoading ? 'opacity-0' : 'opacity-100'}`} />
           {isLoading && <Loader2 size={20} className="animate-spin absolute" />}
        </button>
      </form>
    </div>
  );
}
