import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  Scale, 
  CreditCard, 
  PieChart as PieIcon, 
  Calendar, 
  Layers, 
  ArrowRight,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { FinancialAccount, ParentCategory, ScopeType, Transaction } from '../types/finance';
import { formatEuro } from '../utils/formatters';
import { 
  TimeframePeriod, 
  getTimeframeRange, 
  isDateInSelectedPeriod 
} from '../utils/dateUtils';

interface DashboardOverviewProps {
  accounts: FinancialAccount[];
  transactions: Transaction[];
  categories: ParentCategory[];
  activeScope: ScopeType;
  activeUserId: string;
  onNavigateToTransactions: () => void;
  onNavigateToAccounts: () => void;
  onNavigateToBudgets: () => void;
}

type TimeframeType = 'monthly' | 'quarterly' | 'annual' | 'historic';

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  accounts,
  transactions,
  categories,
  activeScope,
  activeUserId,
  onNavigateToTransactions,
  onNavigateToAccounts,
  onNavigateToBudgets,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeType>('monthly');
  const [currentPeriod, setCurrentPeriod] = useState<TimeframePeriod>({
    year: 2026,
    month: 9, // 0-indexed: 9 is October
    quarter: 4, // Q4
  });

  const [distributionMode, setDistributionMode] = useState<'categories' | 'subcategories'>('categories');
  const [selectedParentFilter, setSelectedParentFilter] = useState<string>('all');

  // Timeframe iteration handlers
  const handlePrevPeriod = () => {
    if (timeframe === 'monthly') {
      setCurrentPeriod(prev => {
        if (prev.month === 0) {
          return { year: prev.year - 1, month: 11, quarter: 4 };
        }
        const newMonth = prev.month - 1;
        const newQuarter = (Math.floor(newMonth / 3) + 1) as 1 | 2 | 3 | 4;
        return { ...prev, month: newMonth, quarter: newQuarter };
      });
    } else if (timeframe === 'quarterly') {
      setCurrentPeriod(prev => {
        if (prev.quarter === 1) {
          return { year: prev.year - 1, quarter: 4, month: 9 };
        }
        const newQuarter = (prev.quarter - 1) as 1 | 2 | 3 | 4;
        return { ...prev, quarter: newQuarter, month: (newQuarter - 1) * 3 };
      });
    } else if (timeframe === 'annual') {
      setCurrentPeriod(prev => ({ ...prev, year: prev.year - 1 }));
    }
  };

  const handleNextPeriod = () => {
    if (timeframe === 'monthly') {
      setCurrentPeriod(prev => {
        if (prev.month === 11) {
          return { year: prev.year + 1, month: 0, quarter: 1 };
        }
        const newMonth = prev.month + 1;
        const newQuarter = (Math.floor(newMonth / 3) + 1) as 1 | 2 | 3 | 4;
        return { ...prev, month: newMonth, quarter: newQuarter };
      });
    } else if (timeframe === 'quarterly') {
      setCurrentPeriod(prev => {
        if (prev.quarter === 4) {
          return { year: prev.year + 1, quarter: 1, month: 0 };
        }
        const newQuarter = (prev.quarter + 1) as 1 | 2 | 3 | 4;
        return { ...prev, quarter: newQuarter, month: (newQuarter - 1) * 3 };
      });
    } else if (timeframe === 'annual') {
      setCurrentPeriod(prev => ({ ...prev, year: prev.year + 1 }));
    }
  };

  const handleResetCurrent = () => {
    setCurrentPeriod({ year: 2026, month: 9, quarter: 4 });
  };

  const activeRange = useMemo(() => {
    return getTimeframeRange(timeframe, currentPeriod);
  }, [timeframe, currentPeriod]);

  // Filter accounts by active scope
  const filteredAccounts = useMemo(() => {
    if (activeScope === 'familiar') return accounts;
    return accounts.filter(acc => acc.ownerId === activeUserId || acc.scope === 'personal');
  }, [accounts, activeScope, activeUserId]);

  // Aggregate asset balances and credit liabilities
  const { totalAssets, totalLiabilities, netWorth, liquidFunds } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    let liquid = 0;

    for (const acc of filteredAccounts) {
      if (acc.accountType === 'card_debit') {
        // Skip debit to avoid double counting checking balance
        continue;
      }
      if (acc.accountType === 'card_credit') {
        if (acc.balance < 0) {
          liabilities += Math.abs(acc.balance);
        } else {
          assets += acc.balance;
        }
      } else {
        assets += acc.balance;
        if (acc.accountType === 'bank_checking' || acc.accountType === 'bank_savings' || acc.accountType === 'cash_wallet') {
          liquid += acc.balance;
        }
      }
    }

    return {
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: assets - liabilities,
      liquidFunds: liquid,
    };
  }, [filteredAccounts]);

  // Filter transactions by active scope and iterative timeframe
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Scope check
      if (activeScope === 'personal' && tx.userId !== activeUserId && tx.scope !== 'personal') {
        return false;
      }

      // Timeframe check with date iteration
      return isDateInSelectedPeriod(tx.date, timeframe, currentPeriod);
    });
  }, [transactions, activeScope, activeUserId, timeframe, currentPeriod]);

  // Calculate Income, Expense, Investment and Net Balance
  const { totalIncome, totalExpense, totalInvested, netBalance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let invested = 0;

    for (const tx of filteredTransactions) {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
        if (tx.categoryId === 'cat_inversion') {
          invested += tx.amount;
        }
      } else if (tx.type === 'transfer' && tx.categoryId === 'cat_inversion') {
        invested += tx.amount;
      }
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      totalInvested: invested,
      netBalance: income - expense,
    };
  }, [filteredTransactions]);

  // Calculate historical monthly average expenditure
  const averageMonthlyExpense = useMemo(() => {
    const historicalTotal = categories
      .filter(c => c.type === 'expense' && c.id !== 'cat_inversion')
      .reduce((sum, c) => sum + c.subcategories.reduce((s, sub) => s + sub.monthlyAverageHistorical, 0), 0);
    return historicalTotal || 1600;
  }, [categories]);

  // Tasa de Cobertura de Gastos: Meses de reserva en fondos líquidos
  const expenseCoverageMonths = useMemo(() => {
    if (averageMonthlyExpense <= 0) return 0;
    return Number((liquidFunds / averageMonthlyExpense).toFixed(1));
  }, [liquidFunds, averageMonthlyExpense]);

  // Calculate uncategorized expense spending
  const { uncategorizedExpenseTotal, uncategorizedCount } = useMemo(() => {
    let sum = 0;
    let count = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'expense' && (!tx.categoryId || tx.categoryId === 'cat_uncategorized' || tx.categoryId === 'sin_categorizar')) {
        sum += tx.amount;
        count += 1;
      }
    }
    return { uncategorizedExpenseTotal: sum, uncategorizedCount: count };
  }, [filteredTransactions]);

  // Calculate spending by category for Donut chart
  const categorySpending = useMemo(() => {
    const catMap = new Map<string, number>();
    for (const tx of filteredTransactions) {
      if (tx.type === 'expense') {
        const catKey = tx.categoryId || 'cat_uncategorized';
        const current = catMap.get(catKey) || 0;
        catMap.set(catKey, current + tx.amount);
      }
    }

    const totalExpenseAmount = Array.from(catMap.values()).reduce((sum, val) => sum + val, 0);

    const items = Array.from(catMap.entries()).map(([catId, amount]) => {
      if (catId === 'cat_uncategorized') {
        return {
          id: 'cat_uncategorized',
          name: '⚠️ Sin Categorizar (Pendiente)',
          amount,
          color: '#f59e0b',
          percentage: totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0,
        };
      }
      const cat = categories.find(c => c.id === catId);
      return {
        id: catId,
        name: cat?.name || 'Varios / General',
        amount,
        color: cat?.color || '#94a3b8',
        percentage: totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0,
      };
    });

    return items.sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories]);

  // Palette for subcategories
  const SUBCATEGORY_PALETTE = [
    '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185',
    '#34d399', '#4ade80', '#a3e635', '#facc15', '#fb923c',
    '#2dd4bf', '#a78bfa', '#f87171', '#60a5fa', '#475569'
  ];

  // Calculate spending by subcategory
  const subcategorySpending = useMemo(() => {
    const subMap = new Map<string, {
      subId: string;
      subName: string;
      parentId: string;
      parentName: string;
      parentColor: string;
      amount: number;
      historicalAvg: number;
    }>();

    for (const tx of filteredTransactions) {
      if (tx.type === 'expense') {
        if (!tx.categoryId || tx.categoryId === 'cat_uncategorized') {
          continue; // Handled below
        }

        if (selectedParentFilter !== 'all' && tx.categoryId !== selectedParentFilter) {
          continue;
        }

        const cat = categories.find(c => c.id === tx.categoryId);
        const sub = cat?.subcategories.find(s => s.id === tx.subcategoryId);

        const prevAmount = subMap.get(tx.subcategoryId || 'otros')?.amount || 0;
        const subIdKey = tx.subcategoryId || 'otros';
        subMap.set(subIdKey, {
          subId: subIdKey,
          subName: sub?.name || 'Varios / General',
          parentId: tx.categoryId,
          parentName: cat?.name || 'General',
          parentColor: cat?.color || '#64748b',
          amount: prevAmount + tx.amount,
          historicalAvg: sub?.monthlyAverageHistorical || 0,
        });
      }
    }

    // Add uncategorized if selected or in all
    if ((selectedParentFilter === 'all' || selectedParentFilter === 'cat_uncategorized') && uncategorizedExpenseTotal > 0) {
      subMap.set('sub_uncategorized', {
        subId: 'sub_uncategorized',
        subName: '⚠️ Sin Categorizar (Pendiente)',
        parentId: 'cat_uncategorized',
        parentName: 'Pendiente de Clasificación',
        parentColor: '#f59e0b',
        amount: uncategorizedExpenseTotal,
        historicalAvg: 0,
      });
    }

    const totalSubExpense = Array.from(subMap.values()).reduce((sum, item) => sum + item.amount, 0);

    const items = Array.from(subMap.values()).map((item, idx) => ({
      ...item,
      color: item.subId === 'sub_uncategorized' ? '#f59e0b' : SUBCATEGORY_PALETTE[idx % SUBCATEGORY_PALETTE.length],
      percentage: totalSubExpense > 0 ? (item.amount / totalSubExpense) * 100 : 0,
      totalReference: totalSubExpense,
    }));

    return items.sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories, selectedParentFilter, uncategorizedExpenseTotal]);

  // Dynamic monthly comparison data based on actual transactions
  const monthlyComparisonData = useMemo(() => {
    const months = [
      { key: '2026-08', label: 'Ago 2026' },
      { key: '2026-09', label: 'Sep 2026' },
      { key: '2026-10', label: 'Oct 2026' },
    ];

    return months.map(m => {
      const monthTxs = transactions.filter(t => t.date.startsWith(m.key));
      let inc = 0;
      let exp = 0;
      let inv = 0;
      for (const t of monthTxs) {
        if (t.type === 'income') inc += t.amount;
        else if (t.type === 'expense') {
          exp += t.amount;
          if (t.categoryId === 'cat_inversion') inv += t.amount;
        } else if (t.type === 'transfer' && t.categoryId === 'cat_inversion') {
          inv += t.amount;
        }
      }
      return {
        month: m.label,
        income: inc,
        expense: exp,
        invested: inv,
      };
    });
  }, [transactions]);

  return (
    <div className="space-y-6">
      
      {/* Scope and Timeframe Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {activeScope === 'familiar' ? 'Consolidado Financiero Familiar' : 'Resumen Financiero Personal'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeScope === 'familiar' 
              ? 'Consolidación de flujos de caja compartidos, nóminas, cuentas conjuntas y ahorro en España.' 
              : 'Gestión exclusiva de asignaciones individuales y cuentas personales activas.'}
          </p>
        </div>

        {/* Timeframe selector & Iterative Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg text-xs">
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                timeframe === 'monthly' ? 'bg-white text-slate-950 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setTimeframe('quarterly')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                timeframe === 'quarterly' ? 'bg-white text-slate-950 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trimestral
            </button>
            <button
              onClick={() => setTimeframe('annual')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                timeframe === 'annual' ? 'bg-white text-slate-950 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Anual
            </button>
            <button
              onClick={() => setTimeframe('historic')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                timeframe === 'historic' ? 'bg-white text-slate-950 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Histórico
            </button>
          </div>

          {/* Iterative Period Controller (Previous / Next / Label) */}
          {timeframe !== 'historic' && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-xs">
              <button
                onClick={handlePrevPeriod}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title={`Ver ${timeframe === 'monthly' ? 'mes' : timeframe === 'quarterly' ? 'trimestre' : 'año'} anterior`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-2 py-0.5 text-center min-w-[140px]">
                <div className="font-semibold text-slate-900 flex items-center justify-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{activeRange.label}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 block leading-tight">
                  {activeRange.startDate} a {activeRange.endDate}
                </span>
              </div>

              <button
                onClick={handleNextPeriod}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title={`Ver ${timeframe === 'monthly' ? 'mes' : timeframe === 'quarterly' ? 'trimestre' : 'año'} siguiente`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {(currentPeriod.month !== 9 || currentPeriod.year !== 2026) && (
                <button
                  onClick={handleResetCurrent}
                  className="ml-1 p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  title="Volver al período actual (Octubre 2026)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Patrimonio Neto */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Patrimonio Neto Total</span>
            <Scale className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-950">
            {formatEuro(netWorth)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Activos: <strong className="font-mono text-slate-700">{formatEuro(totalAssets, { maximumFractionDigits: 0 })}</strong></span>
            <span>Pasivos: <strong className="font-mono text-rose-600">-{formatEuro(totalLiabilities, { maximumFractionDigits: 0 })}</strong></span>
          </div>
        </div>

        {/* KPI 2: Flujo Neto del Período */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Balance Neto del Período</span>
            <div className={`p-1 rounded ${netBalance >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
              {netBalance >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatEuro(netBalance, { showSign: true })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Ingresos: <strong className="font-mono text-emerald-600">{formatEuro(totalIncome, { maximumFractionDigits: 0 })}</strong></span>
            <span>Gastos: <strong className="font-mono text-slate-700">{formatEuro(totalExpense, { maximumFractionDigits: 0 })}</strong></span>
          </div>
        </div>

        {/* KPI 3: Tasa de Cobertura de Gastos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Colchón de Reserva Líquida</span>
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-950">
            {expenseCoverageMonths} <span className="text-sm font-normal text-slate-500">meses</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Fondos líquidos disponibles ({formatEuro(liquidFunds, { maximumFractionDigits: 0 })}) ante gasto mensual de {formatEuro(averageMonthlyExpense, { maximumFractionDigits: 0 })}.
          </div>
        </div>

        {/* KPI 4: Ahorro & Inversión Directa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Ahorro &amp; Inversión Periódica</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-700">
            {formatEuro(totalInvested)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {totalIncome > 0 ? (
              <span>Tasa de Ahorro/Inversión: <strong className="font-mono text-slate-700">{((totalInvested / totalIncome) * 100).toFixed(1)}%</strong></span>
            ) : (
              <span>Aportaciones a fondos indexados y colchón</span>
            )}
          </div>
        </div>

      </div>
      
      {/* Pending Uncategorized Alert Banner */}
      {uncategorizedCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Tienes {uncategorizedCount} {uncategorizedCount === 1 ? 'movimiento' : 'movimientos'} por un total de {formatEuro(uncategorizedExpenseTotal)} pendiente{uncategorizedCount === 1 ? '' : 's'} por categorizar
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Aparecen reflejados en la gráfica de distribución como "Sin Categorizar". Puedes clasificarlos de inmediato para mantener tus presupuestos exactos.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToTransactions}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Revisar y Asignar Categorías
          </button>
        </div>
      )}

      {/* Main Grid: Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Monthly Flow Comparison & Visual Bars */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Flujo Comparativo de Caja (Ingresos vs Egresos vs Inversión)</h2>
              <p className="text-xs text-slate-500">Evolución de liquidez mensual consolidada en España</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span> Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block"></span> Gastos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block"></span> Inversión
              </span>
            </div>
          </div>

          {/* SVG Bar Comparison Chart */}
          <div className="h-64 flex items-end justify-between gap-6 pt-6 px-4 border-b border-slate-100">
            {monthlyComparisonData.map((d, idx) => {
              const maxVal = 3200; // Scaled to Spain couple salary ~2.630 €
              const hIncome = Math.min((d.income / maxVal) * 100, 100);
              const hExpense = Math.min((d.expense / maxVal) * 100, 100);
              const hInvest = Math.min((d.invested / maxVal) * 100, 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-2 h-48">
                    {/* Income Bar */}
                    <div 
                      style={{ height: `${hIncome}%` }} 
                      className="w-5 sm:w-8 bg-emerald-500/90 hover:bg-emerald-600 rounded-t transition-all relative flex justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                        {formatEuro(d.income, { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Expense Bar */}
                    <div 
                      style={{ height: `${hExpense}%` }} 
                      className="w-5 sm:w-8 bg-slate-400/90 hover:bg-slate-500 rounded-t transition-all relative flex justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                        {formatEuro(d.expense, { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Invested Bar */}
                    <div 
                      style={{ height: `${hInvest}%` }} 
                      className="w-5 sm:w-8 bg-blue-600/90 hover:bg-blue-700 rounded-t transition-all relative flex justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                        {formatEuro(d.invested, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-600 mt-3">{d.month}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>{activeRange.label}: Superávit del <strong>{totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0}%</strong></span>
            <button
              onClick={onNavigateToBudgets}
              className="text-slate-900 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Pacto Presupuestario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Donut Distribution (Categories or Subcategories) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Distribución de Gastos</h2>
              <PieIcon className="w-4 h-4 text-slate-400" />
            </div>

            {/* Segmented Control: Categorías vs Subcategorías */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg text-xs mb-3">
              <button
                type="button"
                onClick={() => {
                  setDistributionMode('categories');
                  setSelectedParentFilter('all');
                }}
                className={`py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  distributionMode === 'categories'
                    ? 'bg-white text-slate-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Categorías
              </button>
              <button
                type="button"
                onClick={() => setDistributionMode('subcategories')}
                className={`py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  distributionMode === 'subcategories'
                    ? 'bg-white text-slate-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Subcategorías
              </button>
            </div>

            {/* Filter by Parent Category if in Subcategories mode */}
            {distributionMode === 'subcategories' && (
              <div className="mb-3">
                <select
                  value={selectedParentFilter}
                  onChange={(e) => setSelectedParentFilter(e.target.value)}
                  className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium outline-hidden"
                >
                  <option value="all">Todas las subcategorías globales</option>
                  {categories.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.id}>
                      Subcategorías de: {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Donut representation with SVG */}
            <div className="flex items-center justify-center py-2">
              <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                {(() => {
                  const dataList = distributionMode === 'categories' ? categorySpending : subcategorySpending;
                  let accumulatedPercent = 0;
                  return dataList.map((item, i) => {
                    const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                    const strokeDashoffset = -accumulatedPercent;
                    accumulatedPercent += item.percentage;
                    return (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="16"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all hover:opacity-85"
                        pathLength="100"
                      />
                    );
                  });
                })()}
                {/* Center circle */}
                <circle cx="50" cy="50" r="28" fill="#ffffff" />
              </svg>
            </div>

            {/* Breakdown table */}
            <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
              {distributionMode === 'categories' ? (
                categorySpending.slice(0, 5).map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => {
                      setSelectedParentFilter(cat.id);
                      setDistributionMode('subcategories');
                    }}
                    className="flex items-center justify-between text-xs hover:bg-slate-50 p-1 rounded transition-colors cursor-pointer group"
                    title="Haz clic para ver subcategorías de esta categoría"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <span className="text-slate-700 truncate font-medium group-hover:text-slate-950">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                      <span className="text-slate-900 font-semibold">{formatEuro(cat.amount)}</span>
                      <span className="text-slate-400 w-10 text-right">{cat.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                subcategorySpending.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">
                    No hay gastos en subcategorías para este filtro.
                  </div>
                ) : (
                  subcategorySpending.map(sub => (
                    <div key={sub.subId} className="flex items-center justify-between text-xs hover:bg-slate-50 p-1 rounded transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }}></span>
                        <div className="truncate">
                          <span className="text-slate-800 font-medium block truncate">{sub.subName}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{sub.parentName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                        <span className="text-slate-900 font-semibold">{formatEuro(sub.amount)}</span>
                        <span className="text-slate-400 w-10 text-right">{sub.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Total {distributionMode === 'subcategories' && selectedParentFilter !== 'all' ? 'Filtrado' : 'Gastos'}:{' '}
              <strong className="font-mono text-slate-900">
                {formatEuro(distributionMode === 'subcategories' && selectedParentFilter !== 'all'
                  ? subcategorySpending.reduce((s, i) => s + i.amount, 0)
                  : totalExpense)}
              </strong>
            </span>
            <button
              onClick={onNavigateToTransactions}
              className="text-slate-900 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Dedicated Section: Gráficas de Distribución de Subcategorías (Ranking & Comparativa) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>Gráficas de Distribución por Subcategorías ({activeRange.label})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Desglose detallado del gasto en subcategorías y porcentaje de impacto sobre el presupuesto
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setSelectedParentFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                selectedParentFilter === 'all'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
            {categories.filter(c => c.type === 'expense').map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedParentFilter(c.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedParentFilter === c.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Bar Chart of Subcategories */}
        <div className="space-y-3 pt-2">
          {subcategorySpending.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No se registran gastos en subcategorías para el período seleccionado.
            </div>
          ) : (
            subcategorySpending.map((sub, idx) => {
              const diffFromHistorical = sub.historicalAvg > 0 
                ? ((sub.amount - sub.historicalAvg) / sub.historicalAvg) * 100 
                : 0;

              return (
                <div key={sub.subId} className="space-y-1 group">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-slate-400 text-[11px] w-5">#{idx + 1}</span>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                      <span className="font-semibold text-slate-900 truncate">{sub.subName}</span>
                      <span className="text-slate-400 hidden sm:inline">·</span>
                      <span className="text-slate-500 text-[11px] hidden sm:inline">{sub.parentName}</span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums text-xs">
                      <span className="font-bold text-slate-900">{formatEuro(sub.amount)}</span>
                      <span className="text-slate-500 font-medium w-12 text-right">{sub.percentage.toFixed(1)}%</span>
                      {sub.historicalAvg > 0 && (
                        <span className={`text-[11px] hidden md:inline w-28 text-right ${
                          diffFromHistorical > 10 ? 'text-rose-600' : diffFromHistorical < -10 ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {diffFromHistorical > 0 ? '+' : ''}{diffFromHistorical.toFixed(0)}% vs hist.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all group-hover:brightness-90"
                      style={{ 
                        width: `${Math.max(sub.percentage, 2)}%`, 
                        backgroundColor: sub.color 
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Account Snapshot Strip */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Estructura Multicuenta Consolidada</h2>
            <p className="text-xs text-slate-500">Cuentas bancarias · Inversión indexada · Tarjetas vinculadas · Billetera</p>
          </div>
          <button
            onClick={onNavigateToAccounts}
            className="text-xs text-slate-900 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Gestionar Cuentas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAccounts.map(acc => {
            const isNegative = acc.balance < 0;
            return (
              <div 
                key={acc.id} 
                className="p-3.5 rounded-lg border border-slate-200/90 hover:border-slate-300 transition-colors bg-slate-50/50"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-medium truncate">{acc.institution}</span>
                  <span className="font-mono">{acc.accountNumberMasked}</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 truncate mb-2">
                  {acc.name}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-base font-bold font-mono tabular-nums ${isNegative ? 'text-rose-600' : 'text-slate-950'}`}>
                    {formatEuro(acc.balance)}
                  </span>
                  <span className="text-[11px] text-slate-500 capitalize">
                    {acc.accountType === 'card_credit' ? 'Saldo Deudor' : acc.accountType.replace('_', ' ')}
                  </span>
                </div>
                {acc.accountType === 'card_credit' && acc.creditLimit && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between">
                    <span>Corte: día {acc.cutoffDay}</span>
                    <span>Límite: {formatEuro(acc.creditLimit, { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
                {acc.accountType === 'investment' && acc.yieldRateAnnual && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-emerald-700 flex justify-between font-medium">
                    <span>Rendimiento Estimado:</span>
                    <span className="font-mono">{acc.yieldRateAnnual}% Anual</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
