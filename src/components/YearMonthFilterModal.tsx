import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Calendar } from 'lucide-react';

export const YearMonthFilterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, setTimeFilter } = useApp();

  if (!isOpen) return null;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = [2026, 2025];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Select Year & Month</h3>
              <p className="text-xs text-slate-500">Filter wholesale sales & KPI reports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Year Selector */}
        <div className="mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Select Year</span>
          <div className="grid grid-cols-2 gap-2">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`py-2.5 rounded-2xl font-bold text-sm border transition ${
                  selectedYear === y
                    ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/30'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Month Chips */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Month</span>
            {selectedMonth !== null && (
              <button
                onClick={() => setSelectedMonth(null)}
                className="text-xs text-sky-600 font-semibold"
              >
                All Months
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {months.map((m, idx) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(selectedMonth === idx ? null : idx)}
                className={`py-2 rounded-xl text-xs font-semibold border transition ${
                  selectedMonth === idx
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setTimeFilter('month');
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-sky-600/30 active:scale-98 transition"
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
};
