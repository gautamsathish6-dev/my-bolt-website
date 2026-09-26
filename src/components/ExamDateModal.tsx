import { useState } from 'react';
import { X, Calendar, Trash2, Clock } from 'lucide-react';

interface ExamDateModalProps {
  deckName: string;
  currentExamDate: number | null;
  currentFinalReviewHours: number;
  onSave: (date: number | null, finalReviewHours: number) => void;
  onClose: () => void;
}

export function ExamDateModal({ deckName, currentExamDate, currentFinalReviewHours, onSave, onClose }: ExamDateModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [dateValue, setDateValue] = useState(
    currentExamDate ? new Date(currentExamDate).toISOString().split('T')[0] : ''
  );
  const [finalReviewHours, setFinalReviewHours] = useState(currentFinalReviewHours ?? 48);
  const [unit, setUnit] = useState<'hours' | 'days'>(
    (currentFinalReviewHours ?? 48) >= 24 ? 'days' : 'hours'
  );

  const displayValue = unit === 'days'
    ? Math.round(finalReviewHours / 24 * 10) / 10
    : finalReviewHours;

  const handleUnitChange = (newUnit: 'hours' | 'days') => {
    setUnit(newUnit);
  };

  const handleValueChange = (val: number) => {
    if (unit === 'days') {
      setFinalReviewHours(Math.round(val * 24));
    } else {
      setFinalReviewHours(Math.round(val));
    }
  };

  const handleSave = () => {
    if (dateValue) {
      const timestamp = new Date(dateValue + 'T23:59:59').getTime();
      onSave(timestamp, finalReviewHours);
    } else {
      onSave(null, finalReviewHours);
    }
  };

  const handleClear = () => {
    onSave(null, finalReviewHours);
  };

  const sliderMin = unit === 'hours' ? 1 : 1;
  const sliderMax = unit === 'hours' ? 168 : 14;
  const sliderStep = unit === 'hours' ? 1 : 0.5;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-slate-700 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Set Exam Date</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500">{deckName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
            When is your exam?
          </label>
          <input
            type="date"
            min={today}
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          />
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Unlock Final Review
            </label>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              <button
                onClick={() => handleUnitChange('hours')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  unit === 'hours' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                Hours
              </button>
              <button
                onClick={() => handleUnitChange('days')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  unit === 'days' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                Days
              </button>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={displayValue}
                onChange={(e) => handleValueChange(Number(e.target.value) || 0)}
                className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400 text-center font-medium"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {unit === 'hours' ? 'hour' : 'day'}{displayValue !== 1 ? 's' : ''} before exam
              </span>
            </div>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={sliderStep}
              value={displayValue}
              onChange={(e) => handleValueChange(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              <span>{sliderMin} {unit === 'hours' ? 'hr' : 'day'}</span>
              <span>{sliderMax} {unit === 'hours' ? 'hr' : 'days'}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50/50 dark:bg-slate-700 rounded-xl p-3 mb-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Once set, your cards will be automatically scheduled so everything is reviewed before the exam.
            The Final Review button will unlock{' '}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {finalReviewHours} hour{finalReviewHours !== 1 ? 's' : ''} ({(finalReviewHours / 24).toFixed(1)} days)
            </span>{' '}
            before your test.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          {currentExamDate && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!dateValue}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
