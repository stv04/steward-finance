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
  Layers,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FolderPlus,
  Palette
} from 'lucide-react';
import { ParentCategory, SubCategory, Transaction } from '../types/finance';
import { formatEuro } from '../utils/formatters';

interface CategoriesViewProps {
  categories: ParentCategory[];
  transactions: Transaction[];
  onAddSubcategory: (parentId: string, newSubcategoryName: string, historicalAverage: number) => void;
  onSaveCategory?: (category: ParentCategory) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onDeleteSubcategory?: (parentId: string, subcategoryId: string) => void;
  onAssignCategoryToTransaction?: (txId: string, categoryId: string, subcategoryId: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  transactions,
  onAddSubcategory,
  onSaveCategory,
  onDeleteCategory,
  onDeleteSubcategory,
  onAssignCategoryToTransaction,
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

  // Modal: Add Subcategory
  const [newSubModalCatId, setNewSubModalCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubHistAvg, setNewSubHistAvg] = useState<string>('50');

  // Modal: Add New Parent Category
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState<string>('#0284c7');

  const [viewMode, setViewMode] = useState<'tree' | 'charts'>('tree');
  const [selectedChartCategory, setSelectedChartCategory] = useState<string>('all');

  const COLOR_PALETTE = [
    '#0284c7', '#16a34a', '#d97706', '#7c3aed', '#e11d48',
    '#059669', '#2563eb', '#ca8a04', '#9333ea', '#db2777',
    '#0d9488', '#4f46e5', '#ea580c', '#c026d3', '#0891b2'
  ];

  const toggleExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Find all uncategorized expense transactions
  const uncategorizedTransactions = transactions.filter(
    tx => tx.type === 'expense' && (!tx.categoryId || tx.categoryId === 'cat_uncategorized')
  );
  const uncategorizedTotalSpending = uncategorizedTransactions.reduce((sum, tx) => sum + tx.amount, 0);

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

  const handleCreateParentCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCatId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCategory: ParentCategory = {
      id: newCatId,
      name: newCatName.trim(),
      icon: 'Tag',
      color: newCatColor,
      type: newCatType,
      subcategories: [
        {
          id: `sub_${newCatId}_general`,
          parentId: newCatId,
          name: 'General',
          monthlyAverageHistorical: 50,
        }
      ],
    };

    if (onSaveCategory) {
      onSaveCategory(newCategory);
    }
    setExpandedCategories(prev => ({ ...prev, [newCatId]: true }));
    setIsAddParentModalOpen(false);
    setNewCatName('');
  };

  const subcategoryPalette = [
    '#0284c7', '#16a34a', '#d97706', '#7c3aed', '#e11d48',
    '#059669', '#2563eb', '#ca8a04', '#9333ea', '#db2777'
  ];

  return (
    <div className="space-y-6">
      
      {/* View Header with Mode Toggle & Create Category Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Categorías y Subcategorías
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Estructura jerárquica conectada a base de datos y gráficas de distribución de gastos
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex p-1 bg-slate-200/70 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'tree' ? 'bg-white text-slate-950 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Estructura &amp; Árbol
            </button>
            <button
              type="button"
              onClick={() => setViewMode('charts')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'charts' ? 'bg-white text-slate-950 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gráficas de Distribución
            </button>
          </div>

          {/* Create Parent Category Button */}
          <button
            type="button"
            onClick={() => setIsAddParentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Nueva Categoría</span>
          </button>
        </div>
      </div>

      {/* Uncategorized Spending Attention Banner & Quick Triage */}
      {uncategorizedTransactions.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-amber-200/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Gastos Pendientes por Categorizar: {uncategorizedTransactions.length} transacciones (${uncategorizedTotalSpending.toFixed(2)})
                </h3>
                <p className="text-xs text-amber-800">
                  Estas transacciones provienen de extractos bancarios o registros rápidos sin clasificación. Asígnales categoría para mantener las métricas exactas:
                </p>
              </div>
            </div>
          </div>

          {/* Quick inline classification for pending transactions */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {uncategorizedTransactions.map(tx => (
              <div key={tx.id} className="bg-white p-3 rounded-lg border border-amber-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500 text-[11px] whitespace-nowrap">{tx.date}</span>
                  <span className="font-semibold text-slate-900 truncate max-w-xs">{tx.description}</span>
                  <span className="font-mono font-bold text-slate-900 whitespace-nowrap">{formatEuro(tx.amount)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Asignar a:</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      if (!selectedVal) return;
                      const [cId, sId] = selectedVal.split('::');
                      if (onAssignCategoryToTransaction) {
                        onAssignCategoryToTransaction(tx.id, cId, sId || '');
                      }
                    }}
                    className="bg-amber-50/50 border border-amber-300 rounded px-2.5 py-1 text-xs text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {categories.filter(c => c.type === 'expense').map(c => (
                      <optgroup key={c.id} label={c.name}>
                        {c.subcategories.map(s => (
                          <option key={s.id} value={`${c.id}::${s.id}`}>
                            {c.name} / {s.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode 1: Categories Tree Grid */}
      {viewMode === 'tree' ? (
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
                        {formatEuro(monthTotal)}
                      </span>
                    </div>

                    <div className="text-right hidden sm:block">
                      <span className="text-[11px] text-slate-400 block">Promedio Histórico</span>
                      <span className="text-sm font-semibold font-mono text-slate-600 tabular-nums">
                        {formatEuro(historicalTotal)}/mes
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setNewSubModalCatId(cat.id)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Añadir subcategoría"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      {onDeleteCategory && cat.subcategories.length === 0 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                              onDeleteCategory(cat.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar categoría vacía"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subcategories List */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {cat.subcategories.length === 0 ? (
                      <div className="p-4 text-xs text-slate-400 text-center">
                        No hay subcategorías registradas en este grupo. Haz clic en '+' para agregar una.
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
                                  {formatEuro(subSpending)}
                                </span>
                              </div>

                              <div className="text-right w-28">
                                <span className="text-[10px] text-slate-400 block">Promedio Histórico</span>
                                <span className="font-mono text-slate-600 tabular-nums">
                                  {formatEuro(sub.monthlyAverageHistorical)}
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

                              {onDeleteSubcategory && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`¿Eliminar la subcategoría "${sub.name}"?`)) {
                                      onDeleteSubcategory(cat.id, sub.id);
                                    }
                                  }}
                                  className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                  title="Eliminar subcategoría"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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
      ) : (
        /* Mode 2: Gráficas de Distribución de Subcategorías */
        <div className="space-y-6">
          {/* Category Filter Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 font-medium whitespace-nowrap">Filtrar por:</span>
            <button
              onClick={() => setSelectedChartCategory('all')}
              className={`px-3 py-1 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedChartCategory === 'all'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas las categorías
            </button>
            {categories.filter(c => c.type === 'expense').map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedChartCategory(cat.id)}
                className={`px-3 py-1 rounded font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedChartCategory === cat.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Cards for each selected category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories
              .filter(c => c.type === 'expense')
              .filter(c => selectedChartCategory === 'all' || c.id === selectedChartCategory)
              .map(cat => {
                const catTotal = getParentMonthSpending(cat.id);
                
                // Calculate subcategory data with percentages
                const subData = cat.subcategories.map((sub, idx) => {
                  const spent = getSubcategoryMonthSpending(sub.id);
                  const percentage = catTotal > 0 ? (spent / catTotal) * 100 : 0;
                  const color = subcategoryPalette[idx % subcategoryPalette.length];
                  return {
                    id: sub.id,
                    name: sub.name,
                    spent,
                    percentage,
                    historicalAvg: sub.monthlyAverageHistorical,
                    color,
                  };
                }).sort((a, b) => b.spent - a.spent);

                return (
                  <div key={cat.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Total en Categoría</span>
                          <span className="text-xs font-mono font-bold text-slate-900">{formatEuro(catTotal)}</span>
                        </div>
                      </div>

                      {/* Donut & Stats Row */}
                      <div className="flex items-center gap-4 py-3">
                        {/* Mini Donut Chart */}
                        <div className="relative shrink-0 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                            {(() => {
                              let accumulated = 0;
                              return subData.map((item, i) => {
                                const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                                const strokeDashoffset = -accumulated;
                                accumulated += item.percentage;
                                return (
                                  <circle
                                    key={i}
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    fill="transparent"
                                    stroke={item.color}
                                    strokeWidth="18"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    pathLength="100"
                                  />
                                );
                              });
                            })()}
                            <circle cx="50" cy="50" r="28" fill="#ffffff" />
                          </svg>
                          <span className="absolute text-[11px] font-mono font-bold text-slate-800">
                            {cat.subcategories.length} subs
                          </span>
                        </div>

                        {/* Top subcategory highlights */}
                        <div className="flex-1 space-y-1.5 text-xs">
                          {subData.slice(0, 3).map(sub => (
                            <div key={sub.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                                <span className="text-slate-700 truncate font-medium">{sub.name}</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                                <span className="text-slate-900 font-semibold">{formatEuro(sub.spent)}</span>
                                <span className="text-slate-400 text-[11px] w-9 text-right">{sub.percentage.toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Detailed subcategory progress bars */}
                      <div className="space-y-2.5 pt-2 border-t border-slate-100">
                        {subData.map(sub => (
                          <div key={sub.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-800 font-medium truncate">{sub.name}</span>
                              <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
                                <span className="text-slate-900 font-semibold">{formatEuro(sub.spent)}</span>
                                <span className="text-slate-500">({sub.percentage.toFixed(1)}%)</span>
                                <span className="text-slate-400">Prom. {formatEuro(sub.historicalAvg, { maximumFractionDigits: 0 })}</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.max(sub.percentage, 2)}%`, backgroundColor: sub.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

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
                  placeholder="Ej. Limpieza del Hogar, Taxi, Cuidado Personal..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Promedio Mensual Histórico (€ EUR)</label>
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
                  Guardar Subcategoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva Categoría Padre */}
      {isAddParentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Crear Nueva Categoría</h3>
              <button
                onClick={() => setIsAddParentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParentCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mascotas, Educación, Negocio..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Naturaleza</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType('expense')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                      newCatType === 'expense'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Gasto / Centro Costo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType('income')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                      newCatType === 'income'
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Ingreso / Flujo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Color Identificador</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                        newCatColor === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddParentModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
