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
  ArrowRight
} from 'lucide-react';
import { FinancialAccount, ParentCategory, ScopeType, Transaction } from '../types/finance';

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

  // Filter transactions by active scope and timeframe
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Scope check
      if (activeScope === 'personal' && tx.userId !== activeUserId && tx.scope !== 'personal') {
        return false;
      }

      // Timeframe check (Current date context is 2026-10-14)
      if (timeframe === 'monthly') {
        return tx.date.startsWith('2026-10');
      } else if (timeframe === 'quarterly') {
        // Q4 2026: October, November, December
        return tx.date.startsWith('2026-10') || tx.date.startsWith('2026-11') || tx.date.startsWith('2026-12');
      } else if (timeframe === 'annual') {
        return tx.date.startsWith('2026');
      }
      return true; // historic
    });
  }, [transactions, activeScope, activeUserId, timeframe]);

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

  // Calculate historical monthly average expenditure to compute Expense Coverage Rate (Tasa de Cobertura de Gastos)
  const averageMonthlyExpense = useMemo(() => {
    const historicalTotal = categories
      .filter(c => c.type === 'expense' && c.id !== 'cat_inversion')
      .reduce((sum, c) => sum + c.subcategories.reduce((s, sub) => s + sub.monthlyAverageHistorical, 0), 0);
    return historicalTotal || 2400;
  }, [categories]);

  // Tasa de Cobertura de Gastos: Meses de reserva en fondos líquidos
  const expenseCoverageMonths = useMemo(() => {
    if (averageMonthlyExpense <= 0) return 0;
    return Number((liquidFunds / averageMonthlyExpense).toFixed(1));
  }, [liquidFunds, averageMonthlyExpense]);

  // Calculate spending by category for Donut chart
  const categorySpending = useMemo(() => {
    const catMap = new Map<string, number>();
    for (const tx of filteredTransactions) {
      if (tx.type === 'expense') {
        const current = catMap.get(tx.categoryId) || 0;
        catMap.set(tx.categoryId, current + tx.amount);
      }
    }

    const items = Array.from(catMap.entries()).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return {
        id: catId,
        name: cat?.name || 'Varios',
        color: cat?.color || '#64748b',
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      };
    });

    return items.sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories, totalExpense]);

  // Historical comparative months
  const monthlyComparisonData = [
    { month: 'Ago 2026', income: 6800, expense: 2540, invested: 1200 },
    { month: 'Sep 2026', income: 6800, expense: 2820, invested: 850 },
    { month: 'Oct 2026', income: 7250, expense: 1845.90, invested: 500 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Scope and Timeframe Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {activeScope === 'familiar' ? 'Consolidado Financiero Familiar' : 'Resumen Financiero Personal'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeScope === 'familiar' 
              ? 'Consolidación de flujos de caja compartidos, patrimonio global y fondos de reserva.' 
              : 'Gestión exclusiva de asignaciones individuales y cuentas personales activas.'}
          </p>
        </div>

        {/* Timeframe selector (Single-line interactive tab controls) */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg self-start sm:self-auto text-xs">
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              timeframe === 'monthly' ? 'bg-white text-slate-950 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mensual (Octubre)
          </button>
          <button
            onClick={() => setTimeframe('quarterly')}
            className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              timeframe === 'quarterly' ? 'bg-white text-slate-950 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Trimestral (Q4)
          </button>
          <button
            onClick={() => setTimeframe('annual')}
            className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              timeframe === 'annual' ? 'bg-white text-slate-950 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Anual 2026
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
            ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Activos: <strong className="font-mono text-slate-700">${totalAssets.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></span>
            <span>Pasivos: <strong className="font-mono text-rose-600">-${totalLiabilities.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></span>
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
            {netBalance >= 0 ? '+' : ''}${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Ingresos: <strong className="font-mono text-emerald-600">${totalIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></span>
            <span>Gastos: <strong className="font-mono text-slate-700">${totalExpense.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></span>
          </div>
        </div>

        {/* KPI 3: Tasa de Cobertura de Gastos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Tasa de Cobertura de Gastos</span>
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-950">
            {expenseCoverageMonths} <span className="text-sm font-normal text-slate-500">meses</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Fondo de reserva líquida (${liquidFunds.toLocaleString('en-US', { maximumFractionDigits: 0 })}) ante gasto mensual de ${averageMonthlyExpense.toFixed(0)}.
          </div>
        </div>

        {/* KPI 4: Ahorro & Inversión Directa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Inversión y Capitalización</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-700">
            ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {totalIncome > 0 ? (
              <span>Tasa de Inversión: <strong className="font-mono text-slate-700">{((totalInvested / totalIncome) * 100).toFixed(1)}%</strong> de ingresos</span>
            ) : (
              <span>Asignado a instrumentos indexados y CETES</span>
            )}
          </div>
        </div>

      </div>

      {/* Main Grid: Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Monthly Flow Comparison & Visual Bars */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Flujo Comparativo de Caja (Ingresos vs Egresos vs Inversión)</h2>
              <p className="text-xs text-slate-500">Evolución de liquidez mensual consolidada</p>
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
              const maxVal = 8000;
              const hIncome = (d.income / maxVal) * 100;
              const hExpense = (d.expense / maxVal) * 100;
              const hInvest = (d.invested / maxVal) * 100;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-2 h-48">
                    {/* Income Bar */}
                    <div 
                      style={{ height: `${hIncome}%` }} 
                      className="w-5 sm:w-8 bg-emerald-500/90 hover:bg-emerald-600 rounded-t transition-all relative flex justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                        ${d.income}
                      </span>
                    </div>

                    {/* Expense Bar */}
                    <div 
                      style={{ height: `${hExpense}%` }} 
                      className="w-5 sm:w-8 bg-slate-400/90 hover:bg-slate-500 rounded-t transition-all relative flex justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                        ${d.expense.toFixed(0)}
                      </span>
                    </div>

                    {/* Invested Bar */}
                    <div 
                      style={{ height: `${hInvest}%` }} 
                      className="w-5 sm:w-8 bg-blue-600/90 hover:bg-blue-700 rounded-t transition-all relative flex justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                        ${d.invested}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-600 mt-3">{d.month}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Octubre 2026: Tasa de Ahorro / Superávit del <strong>{totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0}%</strong></span>
            <button
              onClick={onNavigateToBudgets}
              className="text-slate-900 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Pacto Presupuestario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Donut Distribution by Category */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Distribución de Gastos</h2>
              <PieIcon className="w-4 h-4 text-slate-400" />
            </div>

            {/* Donut representation with SVG */}
            <div className="flex items-center justify-center py-2">
              <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                {(() => {
                  let accumulatedPercent = 0;
                  return categorySpending.map((cat, i) => {
                    const strokeDasharray = `${cat.percentage} ${100 - cat.percentage}`;
                    const strokeDashoffset = -accumulatedPercent;
                    accumulatedPercent += cat.percentage;
                    return (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={cat.color}
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

            {/* Category breakdown table */}
            <div className="space-y-2 mt-4">
              {categorySpending.slice(0, 5).map(cat => (
                <div key={cat.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-slate-700 truncate font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                    <span className="text-slate-900 font-semibold">${cat.amount.toFixed(2)}</span>
                    <span className="text-slate-400 w-10 text-right">{cat.percentage.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total: <strong className="font-mono text-slate-900">${totalExpense.toFixed(2)}</strong></span>
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

      {/* Account Snapshot Strip */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Estructura Multicuenta Consolidada</h2>
            <p className="text-xs text-slate-500">2 Cuentas bancarias · 2 Plataformas de inversión · Tarjetas · Pasarelas · Efectivo</p>
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
                    ${Math.abs(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-500 capitalize">
                    {acc.accountType === 'card_credit' ? 'Saldo Deudor' : acc.accountType.replace('_', ' ')}
                  </span>
                </div>
                {acc.accountType === 'card_credit' && acc.creditLimit && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between">
                    <span>Corte: día {acc.cutoffDay}</span>
                    <span>Límite: ${acc.creditLimit}</span>
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
