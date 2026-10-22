import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Edit2,
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Plus, 
  X,
  History,
  FileCheck
} from 'lucide-react';
import { BudgetAccord, BudgetEnvelope, ParentCategory, ScopeType, Transaction, UserProfile } from '../types/finance';
import { calculateMonthBudgetSummary, MonthBudgetSummary } from '../utils/budgetEngine';
import { formatEuro } from '../utils/formatters';

interface BudgetsViewProps {
  accords: BudgetAccord[];
  transactions: Transaction[];
  categories: ParentCategory[];
  users: UserProfile[];
  activeScope: ScopeType;
  activeUserId: string;
  onSaveNewAccord: (newAccord: BudgetAccord) => void;
  onUpdateAccord?: (updatedAccord: BudgetAccord) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  accords,
  transactions,
  categories,
  users,
  activeScope,
  activeUserId,
  onSaveNewAccord,
  onUpdateAccord,
}) => {
  // Current month context: Defaults to current real month (YYYY-MM)
  const currentActualMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // If October 2026 or current real month is preferred, let's keep current real month or fallback
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isAccordModalOpen, setIsAccordModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingAccordId, setEditingAccordId] = useState<string | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr);
    let m = parseInt(monthStr) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr);
    let m = parseInt(monthStr) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  // Calculate budget summary with recursive inheritance for selectedMonth
  const summary: MonthBudgetSummary = useMemo(() => {
    return calculateMonthBudgetSummary(selectedMonth, activeScope, accords, transactions, categories);
  }, [selectedMonth, activeScope, accords, transactions, categories]);

  // Format month name in Spanish
  const formatMonthTitle = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // Check if selected month is the current calendar month
  const isSelectedMonthCurrent = selectedMonth === currentActualMonth;

  // Can edit if selected month is current month AND there is an active accord
  const canEditCurrentMonthBudget = isSelectedMonthCurrent && !!summary.activeAccord;

  // State for creating or editing an accord
  const [newAccordName, setNewAccordName] = useState<string>('');
  const [newAccordMonth, setNewAccordMonth] = useState<string>(selectedMonth);
  const [newAccordEnvelopes, setNewAccordEnvelopes] = useState<Record<string, number>>({});

  const openCreateAccordModal = () => {
    setIsEditMode(false);
    setEditingAccordId(null);
    setNewAccordName(`Pacto Presupuestario ${formatMonthTitle(selectedMonth)}`);
    setNewAccordMonth(selectedMonth);
    
    // Pre-populate with current envelopes or defaults
    const initialMap: Record<string, number> = {};
    for (const cat of categories.filter(c => c.type === 'expense')) {
      const existing = summary.envelopeStatuses.find(e => e.categoryId === cat.id);
      initialMap[cat.id] = existing ? existing.budgetedAmount : 300;
    }
    setNewAccordEnvelopes(initialMap);
    setIsAccordModalOpen(true);
  };

  const openEditCurrentAccordModal = () => {
    if (!summary.activeAccord || !canEditCurrentMonthBudget) return;

    setIsEditMode(true);
    // If the active accord's effectiveMonth is already the current month, we edit that accord.
    // If it was inherited from a previous month, editing the budget for the current month promulgates/creates
    // the accord explicitly for the current month so past historical months remain intact.
    const isDirectCurrentMonth = summary.activeAccord.effectiveMonth === currentActualMonth;
    setEditingAccordId(isDirectCurrentMonth ? summary.activeAccord.id : null);
    setNewAccordName(summary.activeAccord.name);
    setNewAccordMonth(currentActualMonth);

    const initialMap: Record<string, number> = {};
    for (const cat of categories.filter(c => c.type === 'expense')) {
      const existing = summary.envelopeStatuses.find(e => e.categoryId === cat.id);
      initialMap[cat.id] = existing ? existing.budgetedAmount : 0;
    }
    setNewAccordEnvelopes(initialMap);
    setIsAccordModalOpen(true);
  };

  const handleSaveAccordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && !canEditCurrentMonthBudget) {
      alert('Solo se permite editar el presupuesto del mes actual.');
      return;
    }

    const envelopes: BudgetEnvelope[] = Object.entries(newAccordEnvelopes).map(([catId, amount]) => ({
      id: `env_${Date.now()}_${catId}`,
      categoryId: catId,
      budgetedAmount: Number(amount) || 0,
    }));

    if (isEditMode && editingAccordId && onUpdateAccord) {
      const updatedAccord: BudgetAccord = {
        ...(summary.activeAccord || {}),
        id: editingAccordId,
        name: newAccordName || `Pacto Presupuestario ${newAccordMonth}`,
        effectiveMonth: newAccordMonth,
        scope: activeScope,
        createdByUserId: activeUserId,
        createdAt: summary.activeAccord?.createdAt || new Date().toISOString(),
        envelopes,
      };
      onUpdateAccord(updatedAccord);
    } else {
      const accord: BudgetAccord = {
        id: `accord_${Date.now()}`,
        name: newAccordName || `Pacto Presupuestario ${newAccordMonth}`,
        effectiveMonth: newAccordMonth,
        scope: activeScope,
        createdByUserId: activeUserId,
        createdAt: new Date().toISOString(),
        envelopes,
      };
      onSaveNewAccord(accord);
    }

    setIsAccordModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* View Header with Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Control de Presupuesto Continuo (Zero-Based Envelopes)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Regla de Herencia Continuada recursiva hasta la promulgación de un Nuevo Pacto
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              title="Mes anterior"
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 capitalize min-w-[130px] text-center font-mono">
              {formatMonthTitle(selectedMonth)}
            </span>
            <button
              onClick={handleNextMonth}
              title="Mes siguiente"
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openCreateAccordModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Nuevo Pacto Presupuestario</span>
          </button>
        </div>
      </div>

      {/* Regla de Herencia Continuada Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
        summary.isInherited 
          ? 'bg-blue-50/70 border-blue-200 text-blue-900' 
          : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            summary.isInherited ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {summary.isInherited ? <History className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold text-sm">
              {summary.isInherited ? 'Presupuesto Heredado Continuo' : 'Pacto Base Primario'}
            </div>
            <div className="text-slate-600 mt-0.5">
              {summary.isInherited ? (
                <span>
                  Heredado automáticamente de: <strong>{summary.activeAccord?.name || 'Pacto Previo'}</strong> (vigente desde {summary.inheritedFromMonth}).
                </span>
              ) : (
                <span>
                  Pacto establecido explícitamente para este período: <strong>{summary.activeAccord?.name}</strong>.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {canEditCurrentMonthBudget && (
            <button
              onClick={openEditCurrentAccordModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Modificar asignación de sobres del mes actual"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Editar Presupuesto del Mes</span>
            </button>
          )}
          <span className="text-[11px] text-slate-500">
            Regla de Herencia: <strong>Recursiva activa</strong>
          </span>
        </div>
      </div>

      {/* Zero-Based Summary Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Ingresos Mes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Ingresos del Mes</span>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {formatEuro(summary.totalIncomePeriod)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Nóminas y rendimientos registrados</span>
        </div>

        {/* Total Presupuestado (Sobres) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Total Asignado a Sobres</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatEuro(summary.totalBudgetedPeriod)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Límite acordado en el pacto</span>
        </div>

        {/* Gasto Realizado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Gasto Realizado</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-950 mt-1">
            {formatEuro(summary.totalRealizedExpensePeriod)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {summary.totalBudgetedPeriod > 0 
              ? `${((summary.totalRealizedExpensePeriod / summary.totalBudgetedPeriod) * 100).toFixed(0)}% del presupuesto consumido`
              : 'Sin gasto registrado'}
          </span>
        </div>

        {/* Zero-Based Balance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Balance Saldo Cero (Por Asignar)</span>
          <div className={`text-xl font-bold font-mono tabular-nums mt-1 ${
            summary.zeroBasedUnassigned >= 0 ? 'text-blue-700' : 'text-rose-700'
          }`}>
            {formatEuro(summary.zeroBasedUnassigned)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {summary.zeroBasedUnassigned === 0 
              ? 'Zero-Based perfecto (Todo euro asignado)' 
              : summary.zeroBasedUnassigned > 0 ? 'Superávit disponible para ahorro' : 'Déficit presupuestario'}
          </span>
        </div>

      </div>

      {/* Envelopes Grid (Alertas de Desviación en Tiempo Real) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Sobres Presupuestarios por Categoría (Monto Presupuestado vs Gasto Realizado)
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Umbrales: Nominal (&lt;80%) · Advertencia (80-100%) · Excedido (&gt;100%)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.envelopeStatuses.map(env => {
            const isExceeded = env.status === 'exceeded';
            const isWarning = env.status === 'warning';

            return (
              <div 
                key={env.envelopeId}
                className={`bg-white p-5 rounded-xl border shadow-xs flex flex-col justify-between transition-colors ${
                  isExceeded 
                    ? 'border-rose-300 bg-rose-50/10' 
                    : isWarning 
                    ? 'border-amber-300 bg-amber-50/10' 
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Category Name & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: env.categoryColor }} />
                      <span className="text-sm font-bold text-slate-900 truncate">{env.categoryName}</span>
                    </div>

                    {isExceeded && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Excedido</span>
                      </span>
                    )}
                    {isWarning && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Atención</span>
                      </span>
                    )}
                    {!isExceeded && !isWarning && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>En meta</span>
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Ejecutado: <strong className="font-mono text-slate-800">{formatEuro(env.realizedAmount)}</strong></span>
                      <span className="font-mono font-bold text-slate-700">{env.percentSpent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          isExceeded ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(env.percentSpent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Disponible Restante</span>
                    <span className={`font-mono font-bold text-sm tabular-nums ${
                      env.availableAmount < 0 ? 'text-rose-700' : 'text-slate-900'
                    }`}>
                      {formatEuro(env.availableAmount)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Presupuestado</span>
                    <span className="font-mono font-semibold text-slate-600 tabular-nums">
                      {formatEuro(env.budgetedAmount)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Promulgar o Editar Pacto Presupuestario */}
      {isAccordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isEditMode ? 'Editar Presupuesto del Mes Actual' : 'Promulgar Nuevo Pacto Presupuestario'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEditMode 
                    ? `Ajustando los sobres presupuestarios para ${formatMonthTitle(newAccordMonth)}`
                    : 'Establece un nuevo marco presupuestario para este y los meses futuros'}
                </p>
              </div>
              <button
                onClick={() => setIsAccordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccordSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Pacto</label>
                <input
                  type="text"
                  required
                  value={newAccordName}
                  onChange={(e) => setNewAccordName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mes de Entrada en Vigor</label>
                <input
                  type="month"
                  required
                  disabled={isEditMode}
                  value={newAccordMonth}
                  onChange={(e) => setNewAccordMonth(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs font-mono border rounded-lg focus:outline-hidden ${
                    isEditMode 
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                      : 'border-slate-300 focus:border-slate-500'
                  }`}
                />
                {isEditMode && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Solo se permite editar el presupuesto del mes en curso ({formatMonthTitle(currentActualMonth)}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Asignación por Sobre de Categoría (€ EUR)
                </label>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {categories.filter(c => c.type === 'expense').map(cat => (
                    <div key={cat.id} className="flex items-center justify-between gap-3 text-xs bg-slate-50 p-2 rounded-lg">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-slate-800 truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={newAccordEnvelopes[cat.id] ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setNewAccordEnvelopes(prev => ({ ...prev, [cat.id]: val }));
                          }}
                          className="w-24 px-2 py-1 text-xs font-mono tabular-nums border border-slate-300 rounded text-right bg-white"
                        />
                        <span className="text-slate-500 font-mono text-xs">€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAccordModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  {isEditMode ? 'Guardar Cambios del Presupuesto' : 'Confirmar y Promulgar Pacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
