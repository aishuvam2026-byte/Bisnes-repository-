import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Expense } from '../types';
import { Receipt, Plus, DollarSign, Calendar, TrendingDown, X } from 'lucide-react';

export const ExpensesView: React.FC<{
  isNewExpenseOpenDirect?: boolean;
  onCloseNewExpenseDirect?: () => void;
}> = ({ isNewExpenseOpenDirect = false, onCloseNewExpenseDirect }) => {
  const { expenses, addExpense, showToast } = useApp();

  const [isAddingExpense, setIsAddingExpense] = useState(isNewExpenseOpenDirect);
  const [category, setCategory] = useState<Expense['category']>('Freight');
  const [amount, setAmount] = useState<number>(500);
  const [description, setDescription] = useState('');
  const [paidVia, setPaidVia] = useState('UPI');

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categories: Expense['category'][] = [
    'Freight',
    'Delivery',
    'Packing',
    'Marketing',
    'Phone/Internet',
    'Salary',
    'Rent',
    'Others',
  ];

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Description is required', 'error');
      return;
    }

    addExpense({
      category,
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      description,
      paidVia,
    });

    setIsAddingExpense(false);
    onCloseNewExpenseDirect?.();
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Monthly Expenses
          </span>
          <span className="text-2xl font-black text-rose-600 block mt-0.5">
            ₹{totalExpense.toLocaleString('en-IN')}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">Freight, packing, delivery and office overheads</p>
        </div>

        <button
          onClick={() => setIsAddingExpense(true)}
          className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-purple-600/25 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {expenses.map((e) => (
          <div
            key={e.id}
            className="glass-card rounded-3xl p-4 border border-white/90 shadow-sm flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{e.category}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  {e.paidVia}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">{e.description}</p>
              <span className="text-[10px] text-slate-400">{e.date}</span>
            </div>

            <span className="text-base font-black text-slate-900 shrink-0">
              -₹{e.amount.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      {/* Add Expense Modal */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-slate-900 text-base">Record Business Expense</h3>
              <button
                onClick={() => {
                  setIsAddingExpense(false);
                  onCloseNewExpenseDirect?.();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maa Kali Roadways freight from Kolkata"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Paid Via</label>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'Cash', 'Bank'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaidVia(m)}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        paidVia === m ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-md"
              >
                Save Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
