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
  RotateCcw,
  Users,
  PiggyBank,
  Coins,
  BarChart2,
  Info,
  Sparkles
} from 'lucide-react';
import { FinancialAccount, ParentCategory, ScopeType, Transaction, UserProfile } from '../types/finance';
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
  users?: UserProfile[];
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
  users = [],
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

  const [familyChartTab, setFamilyChartTab] = useState<'comparison' | 'distribution'>('comparison');

  // Filter accounts by active scope: In familiar mode, include all family accounts; in personal, active user only
  const filteredAccounts = useMemo(() => {
    if (activeScope === 'familiar') return accounts;
    return accounts.filter(acc => acc.ownerId === activeUserId);
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
  // Personal scope = only transactions of activeUserId
  // Familiar scope = all family transactions (even if marked personal)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (activeScope === 'personal' && tx.userId !== activeUserId) {
        return false;
      }
      return isDateInSelectedPeriod(tx.date, timeframe, currentPeriod);
    });
  }, [transactions, activeScope, activeUserId, timeframe, currentPeriod]);

  // List of all family members detected from users list and transactions
  const familyMembers = useMemo(() => {
    const list = users && users.length > 0 ? [...users] : [];
    const knownIds = new Set(list.map(u => u.id));
    const isMockMode = list.some(u => u.id === 'usr_carlos' || u.id === 'usr_sofia');

    for (const tx of transactions) {
      if (tx.userId && !knownIds.has(tx.userId)) {
        // If in real authenticated family mode, never include mock demo users!
        if (!isMockMode && (tx.userId === 'usr_carlos' || tx.userId === 'usr_sofia')) {
          continue;
        }
        list.push({
          id: tx.userId,
          name: tx.userId === 'usr_carlos' ? 'Carlos Mendoza' : tx.userId === 'usr_sofia' ? 'Sofía Rodríguez' : `Miembro (${tx.userId.replace(/^usr_/, '').substring(0, 6)})`,
          email: `${tx.userId}@familia.internal`,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(tx.userId)}`,
          role: 'member'
        });
        knownIds.add(tx.userId);
      }
    }
    return list;
  }, [users, transactions]);

  // Consolidated 4 Pillars for the Family and per Member (Ganado · Ahorrado · Invertido · Gastado)
  const familyDynamics = useMemo(() => {
    const periodTxs = transactions.filter(tx => isDateInSelectedPeriod(tx.date, timeframe, currentPeriod));

    const memberBreakdown = familyMembers.map(member => {
      const mTxs = periodTxs.filter(tx => tx.userId === member.id);

      // 1. Ganado (Income / Earnings)
      const earned = mTxs
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

      // 2. Gastado (Ordinary living expenses excluding investment)
      const spent = mTxs
        .filter(tx => tx.type === 'expense' && tx.categoryId !== 'cat_inversion')
        .reduce((sum, tx) => sum + tx.amount, 0);

      // 3. Invertido (Transfers to investment accounts or category cat_inversion)
      const invested = mTxs
        .filter(tx => (
          tx.categoryId === 'cat_inversion' ||
          (tx.type === 'transfer' && accounts.find(a => a.id === tx.destinationAccountId)?.accountType === 'investment')
        ))
        .reduce((sum, tx) => sum + tx.amount, 0);

      // 4. Ahorrado (Surplus generated from income or explicit transfer to savings account)
      const savingsTransfers = mTxs
        .filter(tx => tx.type === 'transfer' && accounts.find(a => a.id === tx.destinationAccountId)?.accountType === 'bank_savings')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const unspentSurplus = Math.max(0, earned - spent - invested);
      const saved = savingsTransfers > 0 ? Math.max(savingsTransfers, unspentSurplus) : unspentSurplus;

      return {
        member,
        earned,
        spent,
        invested,
        saved,
        flowTotal: Math.max(earned, spent + invested + saved, 1)
      };
    });

    const totalEarned = memberBreakdown.reduce((sum, m) => sum + m.earned, 0);
    const totalSpent = memberBreakdown.reduce((sum, m) => sum + m.spent, 0);
    const totalInvested = memberBreakdown.reduce((sum, m) => sum + m.invested, 0);
    const totalSaved = memberBreakdown.reduce((sum, m) => sum + m.saved, 0);

    const maxBarValue = Math.max(
      ...memberBreakdown.flatMap(m => [m.earned, m.spent, m.invested, m.saved]),
      400
    );

    return {
      members: memberBreakdown,
      totalEarned,
      totalSpent,
      totalInvested,
      totalSaved,
      maxBarValue,
      savingsRate: totalEarned > 0 ? (totalSaved / totalEarned) * 100 : 0,
      investRate: totalEarned > 0 ? (totalInvested / totalEarned) * 100 : 0,
      spentRate: totalEarned > 0 ? (totalSpent / totalEarned) * 100 : 0,
    };
  }, [familyMembers, transactions, accounts, timeframe, currentPeriod]);

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
      
      {/* Consolidated Family Nucleus Wealth Dynamics (Ganado · Ahorrado · Invertido · Gastado) */}
      {activeScope === 'familiar' && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Consolidado General del Núcleo Familiar
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    4 Pilares Patrimoniales
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Relación comparativa entre lo <strong>Ganado</strong>, <strong>Ahorrado</strong>, <strong>Invertido</strong> y <strong>Gastado</strong> por cada miembro ({activeRange.label})
                </p>
              </div>
            </div>

            {/* Switcher Tab */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFamilyChartTab('comparison')}
                className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  familyChartTab === 'comparison'
                    ? 'bg-white text-slate-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Barras Comparativas
              </button>
              <button
                type="button"
                onClick={() => setFamilyChartTab('distribution')}
                className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  familyChartTab === 'distribution'
                    ? 'bg-white text-slate-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Distribución % Flujo
              </button>
            </div>
          </div>

          {/* 4 Pillars Family Total Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Ganado */}
            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-medium mb-1">
                <span>Ganado (Ingresos)</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-950">
                {formatEuro(familyDynamics.totalEarned)}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                100% de entradas consolidadas
              </div>
            </div>

            {/* Ahorrado */}
            <div className="p-3.5 rounded-lg border border-sky-200 bg-sky-50/50">
              <div className="flex items-center justify-between text-sky-800 text-xs font-medium mb-1">
                <span>Ahorrado (Reserva)</span>
                <PiggyBank className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-xl font-bold font-mono text-sky-950">
                {formatEuro(familyDynamics.totalSaved)}
              </div>
              <div className="text-[11px] text-sky-700 mt-1">
                Tasa de ahorro: <strong>{familyDynamics.savingsRate.toFixed(1)}%</strong>
              </div>
            </div>

            {/* Invertido */}
            <div className="p-3.5 rounded-lg border border-violet-200 bg-violet-50/50">
              <div className="flex items-center justify-between text-violet-800 text-xs font-medium mb-1">
                <span>Invertido (Patrimonio)</span>
                <TrendingUp className="w-4 h-4 text-violet-600" />
              </div>
              <div className="text-xl font-bold font-mono text-violet-950">
                {formatEuro(familyDynamics.totalInvested)}
              </div>
              <div className="text-[11px] text-violet-700 mt-1">
                Tasa inversión: <strong>{familyDynamics.investRate.toFixed(1)}%</strong>
              </div>
            </div>

            {/* Gastado */}
            <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/50">
              <div className="flex items-center justify-between text-rose-800 text-xs font-medium mb-1">
                <span>Gastado (Consumo)</span>
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-bold font-mono text-rose-950">
                {formatEuro(familyDynamics.totalSpent)}
              </div>
              <div className="text-[11px] text-rose-700 mt-1">
                Tasa de gasto: <strong>{familyDynamics.spentRate.toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl">
            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">Comparativa por Miembro Familiar:</span>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500"></span> Ganado
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-sky-500"></span> Ahorrado
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-violet-600"></span> Invertido
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-rose-400"></span> Gastado
                </span>
              </div>
            </div>

            {/* Tab 1: Grouped Multi-Bar Comparison Chart */}
            {familyChartTab === 'comparison' ? (
              <div className="pt-6">
                <div className="h-64 flex items-end justify-around gap-6 sm:gap-12 px-2 sm:px-8 border-b border-slate-200">
                  {familyDynamics.members.map((m, idx) => {
                    const maxVal = familyDynamics.maxBarValue;
                    const hEarned = Math.min((m.earned / maxVal) * 100, 100);
                    const hSaved = Math.min((m.saved / maxVal) * 100, 100);
                    const hInvested = Math.min((m.invested / maxVal) * 100, 100);
                    const hSpent = Math.min((m.spent / maxVal) * 100, 100);

                    return (
                      <div key={m.member.id || idx} className="flex-1 max-w-[280px] flex flex-col items-center h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-1.5 sm:gap-3 h-48">
                          {/* Ganado Bar */}
                          <div className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            <div 
                              style={{ height: `${Math.max(hEarned, 3)}%` }} 
                              className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all relative"
                            >
                              <span className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-md">
                                Ganado: {formatEuro(m.earned, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>

                          {/* Ahorrado Bar */}
                          <div className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            <div 
                              style={{ height: `${Math.max(hSaved, 3)}%` }} 
                              className="w-full bg-sky-500 hover:bg-sky-600 rounded-t transition-all relative"
                            >
                              <span className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-md">
                                Ahorrado: {formatEuro(m.saved, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>

                          {/* Invertido Bar */}
                          <div className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            <div 
                              style={{ height: `${Math.max(hInvested, 3)}%` }} 
                              className="w-full bg-violet-600 hover:bg-violet-700 rounded-t transition-all relative"
                            >
                              <span className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-md">
                                Invertido: {formatEuro(m.invested, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>

                          {/* Gastado Bar */}
                          <div className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            <div 
                              style={{ height: `${Math.max(hSpent, 3)}%` }} 
                              className="w-full bg-rose-400 hover:bg-rose-500 rounded-t transition-all relative"
                            >
                              <span className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-md">
                                Gastado: {formatEuro(m.spent, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Member Identity & Summary Footer */}
                        <div className="flex items-center gap-2 mt-3 pt-2 text-center">
                          <img 
                            src={m.member.avatar} 
                            alt={m.member.name} 
                            className="w-6 h-6 rounded-full object-cover border border-slate-300 shrink-0" 
                          />
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-900 block leading-tight">{m.member.name.split(' ')[0]}</span>
                            <span className="text-[10px] font-mono text-emerald-700 font-semibold block leading-tight">{formatEuro(m.earned, { maximumFractionDigits: 0 })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Tab 2: Proportional Allocation Stacked Bars */
              <div className="py-6 px-2 sm:px-6 space-y-5">
                {familyDynamics.members.map((m, idx) => {
                  const total = m.flowTotal;
                  const pSpent = Math.round((m.spent / total) * 100);
                  const pSaved = Math.round((m.saved / total) * 100);
                  const pInvested = Math.round((m.invested / total) * 100);

                  return (
                    <div key={m.member.id || idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <img src={m.member.avatar} alt={m.member.name} className="w-5 h-5 rounded-full object-cover border border-slate-300" />
                          <span className="font-bold text-slate-900">{m.member.name}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-[11px] text-slate-500 font-mono">Ganado: {formatEuro(m.earned)}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600">
                          Gasto {pSpent}% · Ahorro {pSaved}% · Inversión {pInvested}%
                        </div>
                      </div>

                      {/* Stacked Allocation Progress Bar */}
                      <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                          style={{ width: `${pSpent}%` }} 
                          className="bg-rose-400 hover:bg-rose-500 transition-all relative group" 
                          title={`Gastado: ${formatEuro(m.spent)} (${pSpent}%)`} 
                        />
                        <div 
                          style={{ width: `${pSaved}%` }} 
                          className="bg-sky-500 hover:bg-sky-600 transition-all relative group" 
                          title={`Ahorrado: ${formatEuro(m.saved)} (${pSaved}%)`} 
                        />
                        <div 
                          style={{ width: `${pInvested}%` }} 
                          className="bg-violet-600 hover:bg-violet-700 transition-all relative group" 
                          title={`Invertido: ${formatEuro(m.invested)} (${pInvested}%)`} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Member Detailed Cards Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {familyDynamics.members.map(m => {
              const incomeShare = familyDynamics.totalEarned > 0 ? (m.earned / familyDynamics.totalEarned) * 100 : 0;
              const savingsRate = m.earned > 0 ? (m.saved / m.earned) * 100 : 0;
              const investRate = m.earned > 0 ? (m.invested / m.earned) * 100 : 0;
              const spentRate = m.earned > 0 ? (m.spent / m.earned) * 100 : 0;

              return (
                <div key={m.member.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <img src={m.member.avatar} alt={m.member.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">{m.member.name}</h4>
                        <span className="text-[11px] text-slate-500">{m.member.role === 'admin' ? 'Administrador Familiar' : 'Miembro Cotitular'}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {incomeShare.toFixed(1)}% Ingreso Familiar
                    </span>
                  </div>

                  {/* 4 Pillars Grid for Member */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-emerald-50/60 border border-emerald-100">
                      <div className="text-[10px] text-emerald-700 font-semibold uppercase">Ganado</div>
                      <div className="text-sm font-mono font-bold text-emerald-950 mt-0.5">{formatEuro(m.earned)}</div>
                    </div>
                    <div className="p-2 rounded bg-sky-50/60 border border-sky-100">
                      <div className="text-[10px] text-sky-700 font-semibold uppercase">Ahorrado</div>
                      <div className="text-sm font-mono font-bold text-sky-950 mt-0.5">{formatEuro(m.saved)}</div>
                      <div className="text-[9px] text-sky-700 font-mono mt-0.5">{savingsRate.toFixed(1)}% de sus ingresos</div>
                    </div>
                    <div className="p-2 rounded bg-violet-50/60 border border-violet-100">
                      <div className="text-[10px] text-violet-700 font-semibold uppercase">Invertido</div>
                      <div className="text-sm font-mono font-bold text-violet-950 mt-0.5">{formatEuro(m.invested)}</div>
                      <div className="text-[9px] text-violet-700 font-mono mt-0.5">{investRate.toFixed(1)}% de sus ingresos</div>
                    </div>
                    <div className="p-2 rounded bg-rose-50/60 border border-rose-100">
                      <div className="text-[10px] text-rose-700 font-semibold uppercase">Gastado</div>
                      <div className="text-sm font-mono font-bold text-rose-950 mt-0.5">{formatEuro(m.spent)}</div>
                      <div className="text-[9px] text-rose-700 font-mono mt-0.5">{spentRate.toFixed(1)}% de sus ingresos</div>
                    </div>
                  </div>

                  {/* Insight Footnote */}
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                    💡 Genera un excedente de ahorro + inversión del <strong>{(savingsRate + investRate).toFixed(1)}%</strong> ({formatEuro(m.saved + m.invested)}) destinado al patrimonio del hogar.
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
