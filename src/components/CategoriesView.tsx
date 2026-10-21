import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  AlertTriangle, 
  FolderPlus, 
  Pencil,
  Sparkles,
  Lock,
  Check,
  X
} from 'lucide-react';
import { ParentCategory, SubCategory, Transaction } from '../types/finance';
import { formatEuro } from '../utils/formatters';
import { findSimilarTransactionsForBulkCategorization } from '../utils/reconciliation';
import { BulkUpdateModal } from './bulkUpdateModal';

interface CategoriesViewProps {
  categories: ParentCategory[];
  transactions: Transaction[];
  onAddSubcategory: (parentId: string, newSubcategoryName: string, historicalAverage: number) => void;
  onSaveCategory?: (category: ParentCategory) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onDeleteSubcategory?: (parentId: string, subcategoryId: string) => void;
  onAssignCategoryToTransaction?: (txId: string, categoryId: string, subcategoryId: string, similarTxIds?: string[]) => void;
}

// 24 distinct, vibrant, accessible colors to ensure no charts have color collisions
const COLOR_PALETTE = [
  '#0284c7', // Sky Blue
  '#16a34a', // Emerald Green
  '#d97706', // Amber Orange
  '#7c3aed', // Vivid Violet
  '#e11d48', // Rose Red
  '#059669', // Mint Teal
  '#2563eb', // Royal Blue
  '#ca8a04', // Golden Amber
  '#9333ea', // Deep Purple
  '#db2777', // Hot Pink
  '#0d9488', // Deep Teal
  '#4f46e5', // Indigo
  '#ea580c', // Bright Orange
  '#c026d3', // Magenta / Fuchsia
  '#0891b2', // Ocean Cyan
  '#65a30d', // Fresh Lime
  '#b45309', // Warm Ochre
  '#475569', // Slate
  '#be123c', // Crimson
  '#4338ca', // Night Indigo
  '#047857', // Forest
  '#a21caf', // Deep Plum
  '#b91c1c', // Rust Red
  '#0e7490', // Deep Cyan
];

const subcategoryPalette = [
  '#0284c7', '#16a34a', '#d97706', '#7c3aed', '#e11d48',
  '#059669', '#2563eb', '#ca8a04', '#9333ea', '#db2777',
  '#0d9488', '#4f46e5', '#ea580c', '#c026d3', '#0891b2'
];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  transactions,
  onAddSubcategory,
  onSaveCategory,
  onDeleteCategory,
  onDeleteSubcategory,
  onAssignCategoryToTransaction,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [viewMode, setViewMode] = useState<'tree' | 'charts'>('tree');
  const [selectedChartCategory, setSelectedChartCategory] = useState<string>('all');

  // --- MAP OF USED COLORS TO PREVENT PALETTE DUPLICATION ---
  const usedColorsMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    categories.forEach(c => {
      if (c.color) {
        map.set(c.color.toLowerCase(), { id: c.id, name: c.name });
      }
    });
    return map;
  }, [categories]);

  const getFirstAvailableColor = (currentCategoryId?: string): string => {
    for (const c of COLOR_PALETTE) {
      const taken = usedColorsMap.get(c.toLowerCase());
      if (!taken || (currentCategoryId && taken.id === currentCategoryId)) {
        return c;
      }
    }
    return COLOR_PALETTE[0];
  };

  // --- MODAL: ADD NEW PARENT CATEGORY ---
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState<string>('#0284c7');
  const [newCatError, setNewCatError] = useState<string>('');

  // --- MODAL: EDIT PARENT CATEGORY ---
  const [editingCategory, setEditingCategory] = useState<ParentCategory | null>(null);
  const [editCatName, setEditCatName] = useState<string>('');
  const [editCatType, setEditCatType] = useState<'expense' | 'income'>('expense');
  const [editCatColor, setEditCatColor] = useState<string>('');
  const [editCatSubcategories, setEditCatSubcategories] = useState<SubCategory[]>([]);
  const [editCatError, setEditCatError] = useState<string>('');
  const [editCatNewSubName, setEditCatNewSubName] = useState<string>('');
  const [editCatNewSubHistAvg, setEditCatNewSubHistAvg] = useState<string>('50');

  // --- MODAL: ADD SUBCATEGORY DIRECTLY ---
  const [newSubModalCatId, setNewSubModalCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubHistAvg, setNewSubHistAvg] = useState<string>('50');

  // --- MODAL: EDIT SUBCATEGORY DIRECTLY ---
  const [editingSubcategory, setEditingSubcategory] = useState<{
    parentId: string;
    sub: SubCategory;
  } | null>(null);
  const [editSubName, setEditSubName] = useState<string>('');
  const [editSubHistAvg, setEditSubHistAvg] = useState<string>('50');

  // --- BULK SIMILARITY ASSIGNMENT PROMPT (string-similarity powered) ---
  const [selectedCategoryAssignIds, setSelectedCategoryAssignIds] = useState<string[]>([]);
  const [bulkAssignPrompt, setBulkAssignPrompt] = useState<{
    primaryTxId: string;
    primaryDesc: string;
    primaryMovement?: string;
    categoryId: string;
    subcategoryId: string;
    categoryLabel: string;
    similarItems: Array<{
      id: string;
      date: string;
      description: string;
      movement?: string;
      amount: number;
      similarityScore: number;
    }>;
  } | null>(null);

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

  // Open Add Category Modal
  const handleOpenAddCategory = () => {
    setNewCatName('');
    setNewCatType('expense');
    setNewCatColor(getFirstAvailableColor());
    setNewCatError('');
    setIsAddParentModalOpen(true);
  };

  // Submit Add Category
  const handleCreateParentCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setNewCatError('Introduce un nombre para la categoría.');
      return;
    }

    // Check if color is already in use
    const taken = usedColorsMap.get(newCatColor.toLowerCase());
    if (taken) {
      setNewCatError(`El color seleccionado ya está en uso por la categoría "${taken.name}". Elige otro para no confundir los gráficos.`);
      return;
    }

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
  };

  // Open Edit Category Modal
  const handleOpenEditCategory = (cat: ParentCategory) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatType(cat.type);
    setEditCatColor(cat.color || getFirstAvailableColor(cat.id));
    setEditCatSubcategories([...cat.subcategories]);
    setEditCatError('');
    setEditCatNewSubName('');
    setEditCatNewSubHistAvg('50');
  };

  // Submit Edit Category
  const handleSaveEditedCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    if (!editCatName.trim()) {
      setEditCatError('Introduce un nombre para la categoría.');
      return;
    }

    // Check if color is already taken by ANOTHER category
    const taken = usedColorsMap.get(editCatColor.toLowerCase());
    if (taken && taken.id !== editingCategory.id) {
      setEditCatError(`El color ya está en uso por la categoría "${taken.name}". Cada categoría debe poseer un color único para los gráficos.`);
      return;
    }

    const updated: ParentCategory = {
      ...editingCategory,
      name: editCatName.trim(),
      type: editCatType,
      color: editCatColor,
      subcategories: editCatSubcategories,
    };

    if (onSaveCategory) {
      onSaveCategory(updated);
    }
    setEditingCategory(null);
  };

  // Add subcategory inside Edit Category modal
  const handleAddSubcategoryInEditModal = () => {
    if (!editCatNewSubName.trim() || !editingCategory) return;

    const newSub: SubCategory = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      parentId: editingCategory.id,
      name: editCatNewSubName.trim(),
      monthlyAverageHistorical: parseFloat(editCatNewSubHistAvg) || 50,
    };

    setEditCatSubcategories(prev => [...prev, newSub]);
    setEditCatNewSubName('');
    setEditCatNewSubHistAvg('50');
  };

  // Remove subcategory inside Edit Category modal
  const handleRemoveSubcategoryInEditModal = (subId: string) => {
    setEditCatSubcategories(prev => prev.filter(s => s.id !== subId));
  };

  // Open Direct Edit Subcategory Modal
  const handleOpenEditSubcategory = (parentId: string, sub: SubCategory) => {
    setEditingSubcategory({ parentId, sub });
    setEditSubName(sub.name);
    setEditSubHistAvg(sub.monthlyAverageHistorical.toString());
  };

  // Save Direct Edit Subcategory
  const handleSaveSubcategoryDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubcategory || !editSubName.trim()) return;

    const parentCat = categories.find(c => c.id === editingSubcategory.parentId);
    if (!parentCat) return;

    const updatedCategory: ParentCategory = {
      ...parentCat,
      subcategories: parentCat.subcategories.map(s => {
        if (s.id === editingSubcategory.sub.id) {
          return {
            ...s,
            name: editSubName.trim(),
            monthlyAverageHistorical: parseFloat(editSubHistAvg) || 0,
          };
        }
        return s;
      }),
    };

    if (onSaveCategory) {
      onSaveCategory(updatedCategory);
    }
    setEditingSubcategory(null);
  };

  // Create Subcategory Submit (from '+' button on category)
  const handleCreateSubcategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubModalCatId || !newSubName.trim()) return;

    onAddSubcategory(newSubModalCatId, newSubName.trim(), parseFloat(newSubHistAvg) || 50);
    setNewSubModalCatId(null);
    setNewSubName('');
    setNewSubHistAvg('50');
  };

  // Intelligent Category Assignment with string-similarity detection
  const handleSelectCategoryForTransaction = (tx: Transaction, selectedValue: string) => {
    if (!selectedValue || !onAssignCategoryToTransaction) return;
    const [cId, sId] = selectedValue.split('::');
    const targetCat = categories.find(c => c.id === cId);
    const targetSub = targetCat?.subcategories.find(s => s.id === sId);
    const label = `${targetCat?.name || 'Categoría'}${targetSub ? ` / ${targetSub.name}` : ''}`;

    // Detect other uncategorized transactions with similar concept and movement using string-similarity
    const similar = findSimilarTransactionsForBulkCategorization(
      { id: tx.id, description: tx.description, movement: tx.movement, type: tx.type },
      uncategorizedTransactions,
      0.80
    );

    if (similar.length > 0) {
      const matchIds = similar.map(s => s.id);
      setSelectedCategoryAssignIds(matchIds);
      setBulkAssignPrompt({
        primaryTxId: tx.id,
        primaryDesc: tx.description,
        primaryMovement: tx.movement,
        categoryId: cId,
        subcategoryId: sId || '',
        categoryLabel: label,
        similarItems: similar.map(s => ({
          id: s.id,
          date: s.date,
          description: s.description,
          movement: s.movement,
          amount: s.amount,
          similarityScore: s.similarityScore,
        })),
      });
    } else {
      // Direct assign if no similar detected
      onAssignCategoryToTransaction(tx.id, cId, sId || '');
    }
  };

  const handleToggleSelectCatAssign = (id: string) => {
    setSelectedCategoryAssignIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllCatAssign = () => {
    if (!bulkAssignPrompt?.similarItems) return;
    setSelectedCategoryAssignIds(bulkAssignPrompt.similarItems.map(s => s.id));
  };

  const handleDeselectAllCatAssign = () => {
    setSelectedCategoryAssignIds([]);
  };

  return (
    <div className="space-y-6">
      
      {/* View Header with Mode Toggle & Create Category Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Categorías y Subcategorías
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Estructura jerárquica con paletas de colores exclusivas, edición completa y detección inteligente por similitud
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
            onClick={handleOpenAddCategory}
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
                  Gastos Pendientes por Categorizar: {uncategorizedTransactions.length} transacciones ({formatEuro(uncategorizedTotalSpending)})
                </h3>
                <p className="text-xs text-amber-800">
                  Asigna categorías y el motor <code>string-similarity</code> detectará automáticamente movimientos y conceptos afines para asignarlos en lote:
                </p>
              </div>
            </div>
          </div>

          {/* Quick inline classification for pending transactions */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {uncategorizedTransactions.map(tx => (
              <div key={tx.id} className="bg-white p-3 rounded-lg border border-amber-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 truncate">
                  <span className="font-mono text-slate-500 text-[11px] whitespace-nowrap">{tx.date}</span>
                  <div className="truncate">
                    <span className="font-semibold text-slate-900 truncate block">{tx.description}</span>
                    {tx.movement && (
                      <span className="text-[10px] text-slate-400 block">Mov: {tx.movement}</span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900 whitespace-nowrap">{formatEuro(tx.amount)}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-500 font-medium">Asignar a:</span>
                  <select
                    defaultValue=""
                    onChange={(e) => handleSelectCategoryForTransaction(tx, e.target.value)}
                    className="bg-amber-50/50 border border-amber-300 rounded px-2.5 py-1 text-xs text-slate-800 font-semibold cursor-pointer max-w-xs"
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
                    <span 
                      className="w-4 h-4 rounded-full shrink-0 shadow-xs ring-1 ring-black/10" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                        <span 
                          className="px-1.5 py-0.2 rounded text-[10px] font-semibold border"
                          style={{ borderColor: `${cat.color}40`, color: cat.color }}
                        >
                          Color Exclusivo
                        </span>
                      </div>
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

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Edit Category Button */}
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Modificar categoría y color"
                      >
                        <Pencil className="w-4 h-4 text-slate-600" />
                      </button>

                      {/* Add Subcategory Button */}
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

                            <div className="flex items-center gap-6">
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

                              {/* Action buttons for subcategory */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditSubcategory(cat.id, sub)}
                                  className="text-slate-400 hover:text-slate-800 p-1 transition-colors cursor-pointer"
                                  title="Editar subcategoría"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

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
                <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: cat.color }} />
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
                          <span className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/10" style={{ backgroundColor: cat.color }} />
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

      {/* --- MODAL: CREAR NUEVA CATEGORÍA PADRE (CON VALIDACIÓN DE COLOR ÚNICO) --- */}
      {isAddParentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Crear Nueva Categoría</h3>
              </div>
              <button
                onClick={() => setIsAddParentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newCatError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{newCatError}</span>
              </div>
            )}

            <form onSubmit={handleCreateParentCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mascotas, Educación, Negocio..."
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    setNewCatError('');
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Naturaleza</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType('expense')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
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
                    className={`py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Color Exclusivo en Gráficos
                  </label>
                  <span className="text-[11px] text-slate-500">
                    (Colores en uso bloqueados)
                  </span>
                </div>

                <div className="grid grid-cols-8 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {COLOR_PALETTE.map(color => {
                    const taken = usedColorsMap.get(color.toLowerCase());
                    const isSelected = newCatColor.toLowerCase() === color.toLowerCase();

                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={!!taken}
                        onClick={() => {
                          if (!taken) {
                            setNewCatColor(color);
                            setNewCatError('');
                          }
                        }}
                        title={taken ? `En uso por: ${taken.name}` : `Disponible`}
                        className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center relative ${
                          taken 
                            ? 'opacity-25 cursor-not-allowed scale-90' 
                            : 'cursor-pointer hover:scale-110'
                        } ${
                          isSelected ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {taken && (
                          <Lock className="w-3 h-3 text-white drop-shadow-xs" />
                        )}
                        {isSelected && !taken && (
                          <Check className="w-3.5 h-3.5 text-white drop-shadow-xs stroke-[3]" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Para no confundir los gráficos de barras y de tarta, no se permite seleccionar un color ya asignado a otra categoría.
                </p>
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
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDITAR CATEGORÍA (NOMBRE, COLOR ÚNICO, SUBCATEGORÍAS) --- */}
      {editingCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">
                  Modificar Categoría: {editingCategory.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editCatError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editCatError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditedCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => {
                    setEditCatName(e.target.value);
                    setEditCatError('');
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Naturaleza</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCatType('expense')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
                      editCatType === 'expense'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Gasto / Centro Costo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCatType('income')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
                      editCatType === 'income'
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Ingreso / Flujo
                  </button>
                </div>
              </div>

              {/* Unique Color Selection in Edit Mode */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Paleta de Color Exclusiva
                  </label>
                  <span className="text-[11px] text-slate-500">
                    (Evita duplicar colores en gráficos)
                  </span>
                </div>

                <div className="grid grid-cols-8 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {COLOR_PALETTE.map(color => {
                    const taken = usedColorsMap.get(color.toLowerCase());
                    const isTakenByAnother = taken && taken.id !== editingCategory.id;
                    const isSelected = editCatColor.toLowerCase() === color.toLowerCase();

                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={isTakenByAnother}
                        onClick={() => {
                          if (!isTakenByAnother) {
                            setEditCatColor(color);
                            setEditCatError('');
                          }
                        }}
                        title={
                          isTakenByAnother 
                            ? `Bloqueado: En uso por "${taken.name}"` 
                            : isSelected ? 'Color actual' : 'Disponible'
                        }
                        className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center relative ${
                          isTakenByAnother 
                            ? 'opacity-25 cursor-not-allowed scale-90' 
                            : 'cursor-pointer hover:scale-110'
                        } ${
                          isSelected ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {isTakenByAnother && (
                          <Lock className="w-3 h-3 text-white drop-shadow-xs" />
                        )}
                        {isSelected && !isTakenByAnother && (
                          <Check className="w-3.5 h-3.5 text-white drop-shadow-xs stroke-[3]" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Los colores atenuados pertenecen a otras categorías y están bloqueados para evitar confusiones en los informes visuales.
                </p>
              </div>

              {/* Subcategories list editor inside edit category modal */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900">
                    Subcategorías ({editCatSubcategories.length})
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Gestiona nombres y presupuestos históricos
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editCatSubcategories.map((sub, idx) => (
                    <div key={sub.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            setEditCatSubcategories(prev => prev.map((s, i) => i === idx ? { ...s, name: newName } : s));
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-medium focus:outline-hidden focus:border-slate-500"
                          placeholder="Nombre de subcategoría"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="5"
                            value={sub.monthlyAverageHistorical}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditCatSubcategories(prev => prev.map((s, i) => i === idx ? { ...s, monthlyAverageHistorical: val } : s));
                            }}
                            className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white text-right focus:outline-hidden focus:border-slate-500"
                            placeholder="0"
                          />
                          <span className="text-slate-500 text-[11px] font-mono">€</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcategoryInEditModal(sub.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Eliminar subcategoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick Add Subcategory form inside edit category modal */}
                <div className="p-2.5 bg-slate-100/70 rounded-lg border border-dashed border-slate-300 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nueva subcategoría..."
                    value={editCatNewSubName}
                    onChange={(e) => setEditCatNewSubName(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden"
                  />
                  <div className="flex items-center gap-1 w-24">
                    <input
                      type="number"
                      step="5"
                      placeholder="Histórico"
                      value={editCatNewSubHistAvg}
                      onChange={(e) => setEditCatNewSubHistAvg(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-md bg-white text-right focus:outline-hidden"
                    />
                    <span className="text-slate-500 text-[11px]">€</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSubcategoryInEditModal}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer shrink-0"
                  >
                    Añadir
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDITAR SUBCATEGORÍA DIRECTA --- */}
      {editingSubcategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Editar Subcategoría</h3>
              </div>
              <button
                onClick={() => setEditingSubcategory(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategoryDirect} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Promedio Mensual Histórico (€ EUR)
                </label>
                <input
                  type="number"
                  step="5"
                  required
                  value={editSubHistAvg}
                  onChange={(e) => setEditSubHistAvg(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubcategory(null)}
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

      {/* --- MODAL: AÑADIR SUBCATEGORÍA --- */}
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

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
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

      {/* --- MODAL: CONFIRMACIÓN INTELIGENTE DE ASIGNACIÓN MASIVA POR SIMILITUD --- */}
      {bulkAssignPrompt && 
        <BulkUpdateModal 
          isOpen={true} 
          onClose={() => setBulkAssignPrompt(null)} 
          onSelectAll={handleSelectAllCatAssign} 
          onDeselectAll={handleDeselectAllCatAssign} 
          onToggleSelect={handleToggleSelectCatAssign} 
          onApplySingleSelect={() => {
            if (onAssignCategoryToTransaction) {
              onAssignCategoryToTransaction(
                bulkAssignPrompt.primaryTxId,
                bulkAssignPrompt.categoryId,
                bulkAssignPrompt.subcategoryId
              );
            }
            setBulkAssignPrompt(null);
          }} 
          onAppySimilarSelect={() => {
            if (onAssignCategoryToTransaction) {
              onAssignCategoryToTransaction(
                bulkAssignPrompt.primaryTxId,
                bulkAssignPrompt.categoryId,
                bulkAssignPrompt.subcategoryId,
                selectedCategoryAssignIds
              );
            }
            setBulkAssignPrompt(null);
          }} 
          bulkPrompt={{
            targetDescription: bulkAssignPrompt.primaryDesc,
            targetMovement: bulkAssignPrompt.primaryMovement,
            categoryLabel: bulkAssignPrompt.categoryLabel,
            similarItems: bulkAssignPrompt.similarItems
          }}
          selectedSimilarTxIds={selectedCategoryAssignIds}        
        />
      }
    </div>
  );
};
