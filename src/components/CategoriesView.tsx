import React, { useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  Tag, 
  X,
  Layers
} from 'lucide-react';
import { ParentCategory, SubCategory, Transaction } from '../types/finance';

interface CategoriesViewProps {
  categories: ParentCategory[];
  transactions: Transaction[];
  onAddSubcategory: (parentId: string, newSubcategoryName: string, historicalAverage: number) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  transactions,
  onAddSubcategory,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    cat_vivienda: true,
    cat_alimentacion: true,
    cat_transporte: true,
    cat_entretenimiento: true,
    cat_salud: true,
    cat_inversion: true,
    cat_ingresos: true,
  });

  const [newSubModalCatId, setNewSubModalCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubHistAvg, setNewSubHistAvg] = useState<string>('50');

  const toggleExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Compute current month spending for October 2026
  const getSubcategoryMonthSpending = (subId: string) => {
    return transactions
      .filter(tx => tx.subcategoryId === subId && tx.date.startsWith('2026-10'))
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const getParentMonthSpending = (catId: string) => {
    return transactions
      .filter(tx => tx.categoryId === catId && tx.date.startsWith('2026-10'))
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const handleCreateSubcategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubModalCatId || !newSubName.trim()) return;

    onAddSubcategory(newSubModalCatId, newSubName.trim(), parseFloat(newSubHistAvg) || 50);
    setNewSubModalCatId(null);
    setNewSubName('');
    setNewSubHistAvg('50');
  };

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Estructura Jerárquica de Categorías y Subcategorías
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo de gasto mensual actual vs. promedio histórico de referencia por rubro
          </p>
        </div>
      </div>

      {/* Categories Tree Grid */}
      <div className="space-y-4">
        {categories.map(cat => {
          const isExpanded = !!expandedCategories[cat.id];
          const monthTotal = getParentMonthSpending(cat.id);
          const historicalTotal = cat.subcategories.reduce((sum, s) => sum + s.monthlyAverageHistorical, 0);
          const isIncome = cat.type === 'income';

          return (
            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Category Parent Bar */}
              <div 
                onClick={() => toggleExpand(cat.id)}
                className="p-4 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-200/60"
              >
                <div className="flex items-center gap-3">
                  <button className="text-slate-400 p-0.5">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                    <span className="text-xs text-slate-500">
                      {cat.subcategories.length} subcategorías asociadas · {isIncome ? 'Flujo de Ingreso' : 'Centro de Costos'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Gasto Actual (Octubre)</span>
                    <span className={`text-sm font-bold font-mono tabular-nums ${isIncome ? 'text-emerald-700' : 'text-slate-900'}`}>
                      ${monthTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-right hidden sm:block">
                    <span className="text-[11px] text-slate-400 block">Promedio Histórico</span>
                    <span className="text-sm font-semibold font-mono text-slate-600 tabular-nums">
                      ${historicalTotal.toFixed(2)}/mes
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewSubModalCatId(cat.id);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                    title="Añadir subcategoría"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subcategories List */}
              {isExpanded && (
                <div className="divide-y divide-slate-100">
                  {cat.subcategories.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 text-center">
                      No hay subcategorías registradas en este grupo.
                    </div>
                  ) : (
                    cat.subcategories.map(sub => {
                      const subSpending = getSubcategoryMonthSpending(sub.id);
                      const variancePercent = sub.monthlyAverageHistorical > 0 
                        ? ((subSpending - sub.monthlyAverageHistorical) / sub.monthlyAverageHistorical) * 100 
                        : 0;

                      return (
                        <div key={sub.id} className="py-3 px-6 flex items-center justify-between text-xs hover:bg-slate-50/50">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-300 font-mono">└─</span>
                            <span className="font-medium text-slate-800">{sub.name}</span>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">Consumo Mes</span>
                              <span className="font-mono font-bold text-slate-900 tabular-nums">
                                ${subSpending.toFixed(2)}
                              </span>
                            </div>

                            <div className="text-right w-28">
                              <span className="text-[10px] text-slate-400 block">Promedio Histórico</span>
                              <span className="font-mono text-slate-600 tabular-nums">
                                ${sub.monthlyAverageHistorical.toFixed(2)}
                              </span>
                            </div>

                            <div className="text-right w-20 hidden md:block">
                              <span className="text-[10px] text-slate-400 block">Desviación</span>
                              <span className={`font-mono font-medium ${
                                variancePercent > 10 ? 'text-rose-600' : variancePercent < -10 ? 'text-emerald-600' : 'text-slate-500'
                              }`}>
                                {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Añadir Subcategoría */}
      {newSubModalCatId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Añadir Subcategoría</h3>
              <button
                onClick={() => setNewSubModalCatId(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubcategorySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Limpieza del Hogar, Taxi..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Promedio Mensual Histórico ($ USD)</label>
                <input
                  type="number"
                  step="5"
                  required
                  value={newSubHistAvg}
                  onChange={(e) => setNewSubHistAvg(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewSubModalCatId(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
