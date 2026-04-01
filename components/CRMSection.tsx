import React, { useState, useRef, useEffect } from 'react';
import { Mic, Save, Loader2, Clock, ChevronDown, User as UserIcon } from 'lucide-react';
import { SalesOrder, AppUser, CRMNote } from '../types';

interface CRMSectionProps {
  sale: SalesOrder;
  onSaveSale: (sale: SalesOrder) => void;
  currentUser?: AppUser | null;
  defaultExpanded?: boolean;
}

export const CRMSection: React.FC<CRMSectionProps> = ({ sale, onSaveSale, currentUser, defaultExpanded = false }) => {
  const [newCrmNote, setNewCrmNote] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const recognitionRef = useRef<any>(null);

  const allNotes = (sale.crmNotes || []) as CRMNote[];
  const displayedNotes = showAllNotes ? allNotes : allNotes.slice(-3);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNewCrmNote(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleAddCrmNote = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!newCrmNote.trim()) return;
    setIsSaving(true);
    try {
      const newNote: CRMNote = {
        id: crypto.randomUUID(),
        userName: currentUser?.name || 'Sistema',
        timestamp: new Date().toISOString(),
        text: newCrmNote.trim()
      };
      const updatedNotes = [...allNotes, newNote];
      const now = new Date().toISOString();
      await onSaveSale({ 
        ...sale, 
        crmNotes: updatedNotes,
        lastInteractionAt: now
      });
      setNewCrmNote('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      <div 
        className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border-b border-slate-100 dark:border-slate-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--primary-color)] text-white rounded-xl shadow-sm">
            <UserIcon size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-[0.15em] flex items-center gap-2">
              CRM / Gestão Comercial
              <ChevronDown size={14} className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-180' : ''}`} />
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              {allNotes.length} interação{allNotes.length !== 1 ? 'es' : ''} registrada{allNotes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {isExpanded && allNotes.length > 3 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setShowAllNotes(!showAllNotes); }}
            className="text-[10px] font-black text-[var(--primary-color)] hover:underline uppercase tracking-widest"
          >
            {showAllNotes ? '- Ver menos' : '+ Ver histórico completo'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6">
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {allNotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 italic">Nenhuma anotação de CRM para esta venda.</p>
              </div>
            ) : (
              displayedNotes.map((note) => (
                <div key={note.id} className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-all hover:border-[var(--primary-color)]/30 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                        {note.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">{note.userName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <Clock size={12} />
                      {new Date(note.timestamp).toLocaleDateString('pt-BR')} às {new Date(note.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed pl-8">{note.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="relative group/input">
              <textarea
                value={newCrmNote}
                onChange={(e) => setNewCrmNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddCrmNote();
                  }
                }}
                placeholder="Descreva a conversa, visita ou retorno do cliente..."
                className="w-full text-sm bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-2xl py-3 px-4 outline-none resize-none min-h-[100px] font-medium text-slate-700 dark:text-slate-200 transition-all pr-12 custom-scrollbar shadow-inner"
              />
              <button
                onClick={toggleListening}
                className={`absolute right-3 top-3 p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-[var(--primary-color)] hover:bg-orange-50 dark:hover:bg-slate-700'}`}
                title="Ditar anotação"
              >
                <Mic size={20} />
              </button>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleAddCrmNote()}
                disabled={isSaving || !newCrmNote.trim()}
                className={`h-11 px-8 rounded-xl transition-all flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest ${newCrmNote.trim() ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/20 hover:opacity-90 active:scale-95' : 'bg-slate-100 dark:bg-slate-800 text-slate-300 pointer-events-none'}`}
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Save size={16} />
                    Salvar Registro Comercial
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
