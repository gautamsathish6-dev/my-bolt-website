import { useState, useRef } from 'react';
import { Layers, Plus, Settings, Trash2, Pencil, X, Check, Copy, Download, Upload } from 'lucide-react';
import { Deck } from '../types';

interface SidebarProps {
  decks: Deck[];
  activeDeckId: string | null;
  cardCounts: Record<string, number>;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function Sidebar({
  decks, activeDeckId, cardCounts,
  onSelect, onCreate, onRename, onDuplicate, onDelete,
  onExport, onImport,
}: SidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName('');
      setCreating(false);
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
      setEditingId(null);
    }
  };

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">OmniDeck</h1>
            <p className="text-xs text-slate-400 -mt-0.5">Smart Flashcards</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {decks.length === 0 && !creating && (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-slate-400">No decks yet. Create one to get started.</p>
          </div>
        )}
        <div className="space-y-1">
          {decks.map((deck) => (
            <div key={deck.id} className="group relative">
              <button
                onClick={() => onSelect(deck.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeDeckId === deck.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${activeDeckId === deck.id ? 'bg-teal-500' : 'bg-slate-300'}`} />
                {editingId === deck.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(deck.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-white border border-teal-300 rounded px-2 py-0.5 text-sm outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium truncate">{deck.name}</span>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  activeDeckId === deck.id ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {cardCounts[deck.id] || 0}
                </span>
              </button>

              {editingId !== deck.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuOpenId === deck.id) {
                      setMenuOpenId(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuPos({ top: rect.top, left: rect.right + 8 });
                      setMenuOpenId(deck.id);
                    }
                  }}
                  className={`absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity ${
                    menuOpenId === deck.id ? 'opacity-100 bg-slate-100' : 'opacity-0 group-hover:opacity-100 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {menuOpenId === deck.id && menuPos && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                  <div
                    className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[150px]"
                    style={{ top: menuPos.top, left: menuPos.left }}
                  >
                    <button
                      onClick={() => { setEditingId(deck.id); setEditName(deck.name); setMenuOpenId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Rename
                    </button>
                    <button
                      onClick={() => { onDuplicate(deck.id); setMenuOpenId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <button
                      onClick={() => { onDelete(deck.id); setMenuOpenId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Backup section */}
      <div className="px-3 py-2 border-t border-slate-100">
        <div className="flex gap-1">
          <button
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Backup
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Restore
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="p-3 border-t border-slate-200">
        {creating ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              placeholder="Deck name..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
            <button onClick={handleCreate} className="p-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setCreating(false); setNewName(''); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-colors text-sm font-medium border border-slate-200 hover:border-teal-200"
          >
            <Plus className="w-4 h-4" /> New Deck
          </button>
        )}
      </div>
    </aside>
  );
}
