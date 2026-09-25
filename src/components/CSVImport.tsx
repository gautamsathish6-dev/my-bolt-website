import { useState, useRef } from 'react';
import { ArrowLeft, Upload, FileText, ArrowRight } from 'lucide-react';

interface CSVImportProps {
  deckName: string;
  onImport: (rows: { front: string; back: string }[]) => void;
  onBack: () => void;
}

export function CSVImport({ deckName, onImport, onBack }: CSVImportProps) {
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [frontCol, setFrontCol] = useState(0);
  const [backCol, setBackCol] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setRawText(reader.result as string);
    };
    reader.readAsText(file);
  };

  const parsedRows = (() => {
    if (!rawText.trim()) return [];
    const lines = rawText.trim().split(/\r?\n/);
    return lines.map((line) => line.split(delimiter === 'tab' ? '\t' : delimiter));
  })();

  const maxCols = parsedRows.length > 0 ? Math.max(...parsedRows.map((r) => r.length)) : 0;

  const handleImport = () => {
    const rows = parsedRows
      .map((row) => ({
        front: (row[frontCol] || '').trim().replace(/^"|"$/g, ''),
        back: (row[backCol] || '').trim().replace(/^"|"$/g, ''),
      }))
      .filter((r) => r.front || r.back);
    onImport(rows);
  };

  const previewRows = parsedRows.slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Import Cards</h2>
            <p className="text-sm text-slate-400">to {deckName}</p>
          </div>
        </div>

        {/* File upload */}
        <div
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all mb-4"
        >
          <Upload className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            {fileName ? `Loaded: ${fileName}` : 'Drop a .csv or .txt file here, or click to browse'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {/* Or paste text */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Or paste text directly
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={'front,back\nWhat is 2+2?,4\nCapital of France?,Paris'}
            rows={5}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-none font-mono"
          />
        </div>

        {/* Delimiter */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-slate-600">Delimiter:</label>
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-teal-400"
          >
            <option value=",">Comma (,)</option>
            <option value="tab">Tab</option>
            <option value=";">Semicolon (;)</option>
            <option value="|">Pipe (|)</option>
          </select>
        </div>

        {/* Column mapping */}
        {maxCols > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Map Columns</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Front Text</label>
                <select
                  value={frontCol}
                  onChange={(e) => setFrontCol(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400"
                >
                  {Array.from({ length: maxCols }, (_, i) => (
                    <option key={i} value={i}>Column {i + 1}</option>
                  ))}
                </select>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 mt-5" />
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Back Text</label>
                <select
                  value={backCol}
                  onChange={(e) => setBackCol(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400"
                >
                  {Array.from({ length: maxCols }, (_, i) => (
                    <option key={i} value={i}>Column {i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {previewRows.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Preview ({parsedRows.length} rows)
            </h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {previewRows.map((row, i) => (
                <div key={i} className="flex items-center gap-3 text-sm py-1 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-400 w-6">{i + 1}</span>
                  <span className="flex-1 text-slate-700 truncate">
                    {(row[frontCol] || '').replace(/^"|"$/g, '') || '(empty)'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <span className="flex-1 text-slate-500 truncate">
                    {(row[backCol] || '').replace(/^"|"$/g, '') || '(empty)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import button */}
        {parsedRows.length > 0 && (
          <button
            onClick={handleImport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import {parsedRows.length} Card{parsedRows.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}
