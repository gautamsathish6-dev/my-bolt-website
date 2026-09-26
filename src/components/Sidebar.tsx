import { useState, useRef } from 'react';
import { Layers, Plus, Settings, Trash2, Pencil, X, Check, Copy, Download, Upload, Sun, Moon } from 'lucide-react';
import { Deck } from '../types';
import { Theme } from '../useTheme';

interface SidebarProps {
  decks: Deck[];
  activeDeckId: string | null;
  cardCounts: Record<string, number>;
  theme: Theme;
  onToggleTheme: () => void;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function Sidebar({
  decks, activeDeckId, cardCounts, theme, onToggleTheme,
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
    <aside className="w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">OmniDeck</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 -mt-0.5">Smart Flashcards</p>
            </div>
          </div>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-500 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {decks.length === 0 && !creating && (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-slate-400 dark:text-slate-500">No decks yet. Create one to get started.</p>
          </div>
        )}
        <div className="space-y-1">
          {decks.map((deck) => (
            <div key={deck.id} className="group relative">
              <button
                onClick={() => onSelect(deck.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeDeckId === deck.id
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${activeDeckId === deck.id ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
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
                    className="flex-1 bg-white dark:bg-slate-700 border border-blue-400 rounded px-2 py-0.5 text-sm text-slate-700 dark:text-slate-200 outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium truncate">{deck.name}</span>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  activeDeckId === deck.id
                    ? 'bg-blue-100 text-blue-600 dark:bg-slate-700 dark:text-blue-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
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
                    menuOpenId === deck.id ? 'opacity-100 bg-slate-100 dark:bg-slate-800' : 'opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </button>
              )}

              {menuOpenId === deck.id && menuPos && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                  <div
                    className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[150px]"
                    style={{ top: menuPos.top, left: menuPos.left }}
                  >
                    <button
                      onClick={() => { setEditingId(deck.id); setEditName(deck.name); setMenuOpenId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Rename
                    </button>
                    <button
                      onClick={() => { onDuplicate(deck.id); setMenuOpenId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <button
                      onClick={() => { onDelete(deck.id); setMenuOpenId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
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
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex gap-1">
          <button
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Backup
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
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
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400"
            />
            <button onClick={handleCreate} className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setCreating(false); setNewName(''); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 transition-colors text-sm font-medium border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700"
          >
            <Plus className="w-4 h-4" /> New Deck
          </button>
        )}
      </div>
    </aside>
  );
}
