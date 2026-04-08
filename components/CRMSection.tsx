import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Save, Loader2, Clock, ChevronDown, User as UserIcon, Edit2, Check, X } from 'lucide-react';
import { SalesOrder, AppUser, CRMNote } from '../types';
import { getInitials } from '../utils/userUtils';

interface CRMSectionProps {
  sale: SalesOrder;
  onSaveSale: (sale: SalesOrder) => void;
  currentUser?: AppUser | null;
  defaultExpanded?: boolean;
  compact?: boolean;
}

export const CRMSection: React.FC<CRMSectionProps> = ({
  sale, onSaveSale, currentUser, defaultExpanded = false, compact = false
}) => {
  const [newCrmNote, setNewCrmNote] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');   // transcrição em tempo real
  const [isSaving, setIsSaving] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef('');    // texto no textarea antes de começar a falar
  const isHoldingRef = useRef(false);

  const allNotes = (sale.crmNotes || []) as CRMNote[];
  const displayedNotes = showAllNotes ? allNotes : allNotes.slice(-3);

  // ─── Speech Recognition setup ────────────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;        // não para em pausas
    rec.interimResults = true;    // resultados em tempo real
    rec.lang = 'pt-BR';

    rec.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += t;
        } else {
          interimChunk += t;
        }
      }

      if (finalChunk) {
        baseTextRef.current = baseTextRef.current
          ? `${baseTextRef.current} ${finalChunk}`
          : finalChunk;
        setNewCrmNote(baseTextRef.current);
      }

      setInterimText(interimChunk);
    };

    rec.onerror = () => {
      setIsListening(false);
      setInterimText('');
      isHoldingRef.current = false;
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimText('');
      // Se o usuário ainda está segurando, reinicia (browser para automaticamente em alguns casos)
      if (isHoldingRef.current) {
        try { rec.start(); } catch (_) {}
      }
    };

    recognitionRef.current = rec;
  }, []);

  // ─── Press-and-hold handlers ─────────────────────────────────────────────────
  const startListening = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (!recognitionRef.current) return;
    isHoldingRef.current = true;
    baseTextRef.current = newCrmNote;
    setIsListening(true);
    try { recognitionRef.current.start(); } catch (_) {}
  }, [newCrmNote]);

  const stopListening = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (!recognitionRef.current || !isHoldingRef.current) return;
    isHoldingRef.current = false;
    setIsListening(false);
    setInterimText('');
    try { recognitionRef.current.stop(); } catch (_) {}
  }, []);

  // ─── Add new note ─────────────────────────────────────────────────────────────
  const handleAddCrmNote = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!newCrmNote.trim()) return;
    setIsSaving(true);
    try {
      const newNote: CRMNote = {
        id: crypto.randomUUID(),
        userName: currentUser?.name || 'Sistema',
        timestamp: new Date().toISOString(),
        text: newCrmNote.trim(),
      };
      await onSaveSale({
        ...sale,
        crmNotes: [...allNotes, newNote],
        lastInteractionAt: new Date().toISOString(),
      });
      setNewCrmNote('');
      baseTextRef.current = '';
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Edit existing note ───────────────────────────────────────────────────────
  const startEditing = (note: CRMNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const saveEdit = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingNoteText.trim()) return;
    setIsSavingEdit(true);
    try {
      const updated = allNotes.map(n =>
        n.id === noteId ? { ...n, text: editingNoteText.trim() } : n
      );
      await onSaveSale({ ...sale, crmNotes: updated });
      setEditingNoteId(null);
      setEditingNoteText('');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  const displayValue = isListening && interimText
    ? (newCrmNote ? `${newCrmNote} ${interimText}` : interimText)
    : newCrmNote;

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 ${compact ? 'rounded-2xl' : 'rounded-3xl'} overflow-hidden shadow-sm`}>
      <div
        className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${!isExpanded && compact ? '' : 'border-b border-slate-100 dark:border-slate-800'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
          <div className={`${compact ? 'p-1.5 bg-slate-400' : 'p-2 bg-[var(--primary-color)]'} text-white rounded-xl shadow-sm shrink-0`}>
            <UserIcon size={compact ? 12 : 18} />
          </div>
          <div className="leading-tight">
            <h3 className={`${compact ? 'text-[8px] mb-0.5' : 'text-xs'} font-bold text-slate-800 dark:text-slate-100 uppercase tracking-[0.1em] flex items-center gap-1.5`}>
              CRM / Gestão Comercial
              <ChevronDown size={compact ? 10 : 14} className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-180' : ''}`} />
            </h3>
            <span className={`${compact ? 'text-[7px]' : 'text-[10px]'} font-bold text-slate-400`}>
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
          {/* Notes list */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {allNotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 italic">Nenhuma anotação de CRM para esta venda.</p>
              </div>
            ) : (
              displayedNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-all hover:border-[var(--primary-color)]/30 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white text-[10px] font-black shadow-sm shrink-0">
                        {getInitials(note.userName)}
                      </div>
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">{note.userName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <Clock size={12} />
                        {new Date(note.timestamp).toLocaleDateString('pt-BR')} às {new Date(note.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {/* Edit button — visible on hover */}
                      {editingNoteId !== note.id && (
                        <button
                          onClick={(e) => startEditing(note, e)}
                          title="Editar anotação"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-[var(--primary-color)] hover:bg-orange-50 dark:hover:bg-slate-700 rounded-lg"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingNoteId === note.id ? (
                    /* Inline edit mode */
                    <div className="pl-8 space-y-2" onClick={e => e.stopPropagation()}>
                      <textarea
                        value={editingNoteText}
                        onChange={e => setEditingNoteText(e.target.value)}
                        autoFocus
                        rows={3}
                        className="w-full text-xs bg-white dark:bg-slate-800 border-2 border-[var(--primary-color)] rounded-xl py-2 px-3 outline-none resize-none font-medium text-slate-700 dark:text-slate-200 transition-all custom-scrollbar"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={(e) => cancelEditing(e)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          <X size={11} /> Cancelar
                        </button>
                        <button
                          onClick={(e) => saveEdit(note.id, e)}
                          disabled={isSavingEdit || !editingNoteText.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black text-white bg-[var(--primary-color)] hover:opacity-90 transition-all disabled:opacity-40"
                        >
                          {isSavingEdit ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed pl-8">{note.text}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* New note input */}
          <div className="space-y-3">
            <div className="relative group/input">
              <textarea
                value={displayValue}
                onChange={(e) => {
                  if (!isListening) setNewCrmNote(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddCrmNote();
                  }
                }}
                placeholder="Descreva a conversa, visita ou retorno do cliente..."
                className={`w-full text-sm bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl py-3 px-4 outline-none resize-none min-h-[100px] font-medium text-slate-700 dark:text-slate-200 transition-all pr-14 custom-scrollbar shadow-inner
                  ${isListening ? 'border-red-400 bg-red-50/10' : 'border-transparent focus:border-[var(--primary-color)]'}`}
                readOnly={isListening}
              />

              {/* Mic button — press and hold */}
              <button
                onPointerDown={startListening}
                onPointerUp={stopListening}
                onPointerLeave={stopListening}
                onPointerCancel={stopListening}
                title={isListening ? 'Solte para parar' : 'Segure para falar'}
                className={`absolute right-3 top-3 p-2.5 rounded-xl transition-all select-none touch-none
                  ${isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110'
                    : 'text-slate-400 hover:text-[var(--primary-color)] hover:bg-orange-50 dark:hover:bg-slate-700'}`}
              >
                <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
              </button>

              {/* Live transcription hint */}
              {isListening && (
                <div className="absolute bottom-3 left-4 right-14 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                  <span className="text-[10px] font-bold text-red-500">Gravando — solte para parar</span>
                </div>
              )}
            </div>

            {/* Mic hint */}
            {!isListening && (
              <p className="text-[9px] text-slate-400 font-bold text-center">
                <Mic size={9} className="inline mr-1" />
                Segure o microfone para falar — solte quando terminar
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleAddCrmNote()}
                disabled={isSaving || !newCrmNote.trim()}
                className={`h-11 px-8 rounded-xl transition-all flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest
                  ${newCrmNote.trim()
                    ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/20 hover:opacity-90 active:scale-95'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-300 pointer-events-none'}`}
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <><Save size={16} /> Salvar Registro Comercial</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
