import React, { useState } from 'react';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_CATEGORIES, 
  INITIAL_TRANSACTIONS, 
  INITIAL_BUDGET_ACCORDS, 
  INITIAL_USERS 
} from './data/mockData';
import { 
  FinancialAccount, 
  ParentCategory, 
  Transaction, 
  BudgetAccord, 
  UserProfile, 
  ScopeType, 
  TransactionType 
} from './types/finance';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { AccountsView } from './components/AccountsView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { CategoriesView } from './components/CategoriesView';
import { SecurityCleView } from './components/SecurityCleView';
import { ApiDocsView } from './components/ApiDocsView';
import { UnitTestsRunner } from './components/UnitTestsRunner';
import { TransactionModal } from './components/TransactionModal';
import { CsvReconciliationModal } from './components/CsvReconciliationModal';

export default function App() {
  // Global application state
  const [users] = useState<UserProfile[]>(INITIAL_USERS);
  const [activeUserId, setActiveUserId] = useState<string>('usr_carlos');
  const [activeScope, setActiveScope] = useState<ScopeType>('familiar');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [accounts, setAccounts] = useState<FinancialAccount[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<ParentCategory[]>(INITIAL_CATEGORIES);
  const [accords, setAccords] = useState<BudgetAccord[]>(INITIAL_BUDGET_ACCORDS);

  // Modal controls
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState<boolean>(false);
  const [txModalInitialType, setTxModalInitialType] = useState<TransactionType>('expense');
  const [txModalInitialOriginAcc, setTxModalInitialOriginAcc] = useState<string | undefined>(undefined);

  // Handle single transaction addition and ledger balance updates
  const handleSaveTransaction = (newTx: Transaction) => {
    setTransactions(prev => [newTx, ...prev]);

    // Update account balances based on transaction type
    setAccounts(prevAccounts => {
      return prevAccounts.map(acc => {
        if (newTx.type === 'expense' && acc.id === newTx.accountId) {
          if (acc.accountType === 'card_credit') {
            return { ...acc, balance: acc.balance - newTx.amount }; // increases liability (more negative)
          }
          return { ...acc, balance: acc.balance - newTx.amount };
        }
        if (newTx.type === 'income' && acc.id === newTx.accountId) {
          return { ...acc, balance: acc.balance + newTx.amount };
        }
        if (newTx.type === 'transfer') {
          if (acc.id === newTx.accountId) {
            return { ...acc, balance: acc.balance - newTx.amount };
          }
          if (acc.id === newTx.destinationAccountId) {
            return { ...acc, balance: acc.balance + newTx.amount };
          }
        }
        return acc;
      });
    });
  };

  // Handle bulk import from Reconciliation CSV Parser
  const handleImportReconciledTransactions = (newTxs: Transaction[]) => {
    setTransactions(prev => [...newTxs, ...prev]);

    // Adjust balances for imported transactions
    setAccounts(prevAccounts => {
      let updated = [...prevAccounts];
      for (const tx of newTxs) {
        updated = updated.map(acc => {
          if (acc.id === tx.accountId) {
            if (tx.type === 'expense') {
              return { ...acc, balance: acc.balance - tx.amount };
            } else if (tx.type === 'income') {
              return { ...acc, balance: acc.balance + tx.amount };
            }
          }
          return acc;
        });
      }
      return updated;
    });
  };

  // Handle manual balance adjustment
  const handleUpdateAccountBalance = (accountId: string, newBalance: number) => {
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, balance: newBalance } : a));
  };

  // Open transfer modal preset
  const handleOpenTransferModal = (originAccountId?: string) => {
    setTxModalInitialType('transfer');
    setTxModalInitialOriginAcc(originAccountId);
    setIsTxModalOpen(true);
  };

  // Handle adding a subcategory to a parent category
  const handleAddSubcategory = (parentId: string, newSubcategoryName: string, historicalAverage: number) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === parentId) {
        const newSub = {
          id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          parentId,
          name: newSubcategoryName,
          monthlyAverageHistorical: historicalAverage,
        };
        return {
          ...cat,
          subcategories: [...cat.subcategories, newSub],
        };
      }
      return cat;
    }));
  };

  // Handle saving a new budget accord
  const handleSaveNewAccord = (newAccord: BudgetAccord) => {
    setAccords(prev => [...prev, newAccord]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      
      {/* 3-Zone Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeScope={activeScope}
        setActiveScope={setActiveScope}
        activeUserId={activeUserId}
        setActiveUserId={setActiveUserId}
        users={users}
        onNewTransaction={() => {
          setTxModalInitialType('expense');
          setTxModalInitialOriginAcc(undefined);
          setIsTxModalOpen(true);
        }}
        onOpenReconciliation={() => setIsReconciliationModalOpen(true)}
      />

      {/* Main Content Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            activeScope={activeScope}
            activeUserId={activeUserId}
            onNavigateToTransactions={() => setActiveTab('transactions')}
            onNavigateToAccounts={() => setActiveTab('accounts')}
            onNavigateToBudgets={() => setActiveTab('budgets')}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            accounts={accounts}
            activeScope={activeScope}
            activeUserId={activeUserId}
            onOpenTransferModal={handleOpenTransferModal}
            onUpdateAccountBalance={handleUpdateAccountBalance}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            users={users}
            activeScope={activeScope}
            activeUserId={activeUserId}
            onNewTransaction={() => {
              setTxModalInitialType('expense');
              setTxModalInitialOriginAcc(undefined);
              setIsTxModalOpen(true);
            }}
            onOpenReconciliation={() => setIsReconciliationModalOpen(true)}
            onDeleteTransaction={(id) => {
              setTransactions(prev => prev.filter(t => t.id !== id));
            }}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetsView
            accords={accords}
            transactions={transactions}
            categories={categories}
            users={users}
            activeScope={activeScope}
            activeUserId={activeUserId}
            onSaveNewAccord={handleSaveNewAccord}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            transactions={transactions}
            onAddSubcategory={handleAddSubcategory}
          />
        )}

        {activeTab === 'architecture' && (
          <SecurityCleView />
        )}

        {activeTab === 'api-docs' && (
          <ApiDocsView
            accounts={accounts}
            transactions={transactions}
            accords={accords}
          />
        )}

        {activeTab === 'unit-tests' && (
          <UnitTestsRunner
            categories={categories}
            transactions={transactions}
            accords={accords}
          />
        )}
      </main>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
        accounts={accounts}
        categories={categories}
        users={users}
        initialType={txModalInitialType}
        initialOriginAccountId={txModalInitialOriginAcc}
        activeUserId={activeUserId}
        activeScope={activeScope}
      />

      <CsvReconciliationModal
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        onImportReconciledTransactions={handleImportReconciledTransactions}
        existingTransactions={transactions}
        categories={categories}
        accounts={accounts}
        activeUserId={activeUserId}
      />

      {/* Quiet, minimalist footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>Plataforma de Gestión Financiera Familiar &amp; Personal</span>
            <span className="mx-2">·</span>
            <span>Ledger Inmutable con Hashing SHA-256</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>TLS 1.3</span>
            <span>AES-256-GCM CLE</span>
            <span>Zero-Based Budgeting</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
