import React, { useState, useEffect } from 'react';
import { 
  HashRouter, 
  Routes, 
  Route, 
  Navigate, 
  useLocation, 
  useNavigate 
} from 'react-router-dom';
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
  TransactionType,
  AccountType 
} from './types/finance';
import { AuthProvider, useAuth } from './context/AuthContext';
import { testFirestoreConnection } from './lib/firebase';
import { 
  subscribeToFamilyAccounts, 
  subscribeToFamilyTransactions, 
  subscribeToFamilyBudgetAccords, 
  createAccountInFirestore,
  deleteAccountFromFirestore,
  saveTransactionToFirestore, 
  bulkImportTransactionsToFirestore, 
  updateAccountInFirestore, 
  saveBudgetAccordToFirestore, 
  deleteTransactionFromFirestore,
  initializeFamilyWithStarterData
} from './services/firestoreService';
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
import { AccountModal } from './components/AccountModal';
import { CsvReconciliationModal } from './components/CsvReconciliationModal';
import { AuthModal } from './components/AuthModal';
import { Cloud, Sparkles, Activity, Plus, ArrowRight } from 'lucide-react';

function MainApp() {
  const { userProfile, currentUser, isDemoMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Active current route path normalized (e.g. 'dashboard', 'accounts', 'transactions')
  const currentPath = location.pathname.replace(/^\//, '') || 'dashboard';

  // Active scope and user state
  const [users] = useState<UserProfile[]>(INITIAL_USERS);
  const [activeUserId, setActiveUserId] = useState<string>('usr_carlos');
  const [activeScope, setActiveScope] = useState<ScopeType>('familiar');

  // Working financial datasets
  const [accounts, setAccounts] = useState<FinancialAccount[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<ParentCategory[]>(INITIAL_CATEGORIES);
  const [accords, setAccords] = useState<BudgetAccord[]>(INITIAL_BUDGET_ACCORDS);

  // Firestore synchronization states
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean | null>(null);
  const [isInitializingCloud, setIsInitializingCloud] = useState<boolean>(false);
  const [hasCloudData, setHasCloudData] = useState<boolean>(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState<string[]>([]);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [accountModalDefaultType, setAccountModalDefaultType] = useState<AccountType>('bank_checking');
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [txModalInitialType, setTxModalInitialType] = useState<TransactionType>('expense');
  const [txModalInitialOriginAcc, setTxModalInitialOriginAcc] = useState<string | undefined>(undefined);

  // Verify connection to Firestore on boot
  useEffect(() => {
    testFirestoreConnection().then(connected => {
      setIsFirestoreConnected(connected);
    });
  }, []);

  // Update activeUserId when authenticated user changes
  useEffect(() => {
    if (userProfile) {
      setActiveUserId(userProfile.id);
    } else {
      setActiveUserId('usr_carlos');
    }
  }, [userProfile]);

  const isRealUser = Boolean(currentUser && !isDemoMode && userProfile?.familyId);
  const familyId = userProfile?.familyId;

  // --- REACT ROUTER ROUTE-BASED ON-DEMAND SUBSCRIPTIONS ---
  // Subscriptions are strictly mounted based on what the active react-router route requires:

  // 1. ACCOUNTS Subscription: needed on '/dashboard', '/accounts', '/transactions', '/budgets'
  // (NOT queried when user visits '/categories', '/architecture', '/api-docs', '/unit-tests')
  const needsAccounts = isRealUser && ['dashboard', 'accounts', 'transactions', 'budgets'].includes(currentPath);

  useEffect(() => {
    if (!needsAccounts || !familyId) {
      if (!isRealUser) {
        setAccounts(INITIAL_ACCOUNTS);
      }
      return;
    }

    setActiveSubscriptions(prev => Array.from(new Set([...prev, 'accounts'])));

    const unsub = subscribeToFamilyAccounts(familyId, (cloudAccounts) => {
      setAccounts(cloudAccounts);
      setHasCloudData(cloudAccounts.length > 0);
    });

    return () => {
      unsub();
      setActiveSubscriptions(prev => prev.filter(s => s !== 'accounts'));
    };
  }, [needsAccounts, familyId, isRealUser]);

  // 2. TRANSACTIONS Subscription: needed ONLY on '/dashboard' and '/transactions'
  // (NOT queried when user is on '/accounts', '/categories', '/budgets', etc.)
  const needsTransactions = isRealUser && ['dashboard', 'transactions'].includes(currentPath);

  useEffect(() => {
    if (!needsTransactions || !familyId) {
      if (!isRealUser) {
        setTransactions(INITIAL_TRANSACTIONS);
      }
      return;
    }

    setActiveSubscriptions(prev => Array.from(new Set([...prev, 'transactions'])));

    const unsub = subscribeToFamilyTransactions(familyId, (cloudTransactions) => {
      setTransactions(cloudTransactions);
    });

    return () => {
      unsub();
      setActiveSubscriptions(prev => prev.filter(s => s !== 'transactions'));
    };
  }, [needsTransactions, familyId, isRealUser]);

  // 3. BUDGET ACCORDS Subscription: needed ONLY on '/budgets'
  // (NOT queried when user is on '/accounts', '/transactions', '/categories', etc.)
  const needsBudgets = isRealUser && ['budgets'].includes(currentPath);

  useEffect(() => {
    if (!needsBudgets || !familyId) {
      if (!isRealUser) {
        setAccords(INITIAL_BUDGET_ACCORDS);
      }
      return;
    }

    setActiveSubscriptions(prev => Array.from(new Set([...prev, 'budgetAccords'])));

    const unsub = subscribeToFamilyBudgetAccords(familyId, (cloudAccords) => {
      if (cloudAccords.length > 0) {
        setAccords(cloudAccords);
      }
    });

    return () => {
      unsub();
      setActiveSubscriptions(prev => prev.filter(s => s !== 'budgetAccords'));
    };
  }, [needsBudgets, familyId, isRealUser]);

  // Initialize Starter Baseline in Firestore for newly registered families (Inherits ONLY Budget & Categories)
  const handleSeedCloudVault = async () => {
    if (!userProfile?.familyId || !currentUser) return;
    setIsInitializingCloud(true);
    try {
      await initializeFamilyWithStarterData(
        userProfile.familyId,
        currentUser.uid,
        userProfile.familyName || 'Familia Principal'
      );
    } catch (err) {
      console.error('Error initializing starter budget:', err);
    } finally {
      setIsInitializingCloud(false);
    }
  };

  // Manual Account Creation
  const handleCreateAccount = async (newAccount: FinancialAccount) => {
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await createAccountInFirestore(userProfile.familyId, newAccount);
      } catch (err) {
        console.error('Firestore create account failed:', err);
      }
      return;
    }

    setAccounts(prev => [newAccount, ...prev]);
  };

  // Manual Account Deletion
  const handleDeleteAccount = async (accountId: string) => {
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await deleteAccountFromFirestore(userProfile.familyId, accountId);
      } catch (err) {
        console.error('Firestore delete account failed:', err);
      }
      return;
    }

    setAccounts(prev => prev.filter(a => a.id !== accountId));
  };

  // Save Transaction
  const handleSaveTransaction = async (newTx: Transaction) => {
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await saveTransactionToFirestore(userProfile.familyId, newTx, accounts);
      } catch (err) {
        console.error('Firestore save transaction failed:', err);
      }
      return;
    }

    setTransactions(prev => [newTx, ...prev]);
    setAccounts(prevAccounts => {
      return prevAccounts.map(acc => {
        if (newTx.type === 'expense' && acc.id === newTx.accountId) {
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

  // Bulk Import Transactions
  const handleImportReconciledTransactions = async (newTxs: Transaction[]) => {
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await bulkImportTransactionsToFirestore(userProfile.familyId, newTxs, accounts);
      } catch (err) {
        console.error('Firestore bulk import failed:', err);
      }
      return;
    }

    setTransactions(prev => [...newTxs, ...prev]);
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

  // Update Account Balance
  const handleUpdateAccountBalance = async (accountId: string, newBalance: number) => {
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await updateAccountInFirestore(userProfile.familyId, accountId, { balance: newBalance });
      } catch (err) {
        console.error('Firestore update account failed:', err);
      }
      return;
    }

    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, balance: newBalance } : a));
  };

  const handleOpenTransferModal = (originAccountId?: string) => {
    setTxModalInitialType('transfer');
    setTxModalInitialOriginAcc(originAccountId);
    setIsTxModalOpen(true);
  };

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

  const handleSaveNewAccord = async (newAccord: BudgetAccord) => {
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await saveBudgetAccordToFirestore(userProfile.familyId, newAccord);
      } catch (err) {
        console.error('Firestore accord save failed:', err);
      }
      return;
    }

    setAccords(prev => [...prev, newAccord]);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await deleteTransactionFromFirestore(userProfile.familyId, id);
      } catch (err) {
        console.error('Firestore delete transaction failed:', err);
      }
      return;
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      
      {/* 3-Zone Navigation Header powered by react-router-dom */}
      <Navbar
        activeScope={activeScope}
        setActiveScope={setActiveScope}
        activeUserId={activeUserId}
        setActiveUserId={setActiveUserId}
        users={users}
        userProfile={userProfile}
        onNewTransaction={() => {
          setTxModalInitialType('expense');
          setTxModalInitialOriginAcc(undefined);
          setIsTxModalOpen(true);
        }}
        onOpenReconciliation={() => setIsReconciliationModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Presentation Mode / Cloud Status Banner */}
      {!isRealUser ? (
        <div className="bg-slate-900 text-white px-4 py-2.5 text-xs border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="font-semibold text-slate-200">Modo Presentación Activo:</span>
              <span className="text-slate-300">
                Visualizando estructura mockup con datos financieros de muestra.
              </span>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded transition-colors cursor-pointer"
            >
              <span>Conectar Bóveda Firebase en Vivo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Real Firebase User Status Banner with react-router-dom route and active queries indicator */
        <div className="bg-emerald-950/90 text-emerald-100 px-4 py-2.5 text-xs border-b border-emerald-800/60">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">Bóveda Cloud en Vivo:</span>
              <span className="text-emerald-200">
                Núcleo: <strong>{userProfile?.familyName || 'Familia'}</strong>
              </span>
              <span className="text-emerald-400/50">·</span>
              <span className="text-emerald-300 inline-flex items-center gap-1 bg-emerald-900/50 px-2 py-0.5 rounded font-mono text-[11px]">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>react-router: /{currentPath}</span>
                <span className="text-emerald-400/60">→</span>
                <span>
                  {activeSubscriptions.length > 0 
                    ? `Consultando: [${activeSubscriptions.join(', ')}]` 
                    : 'Sin consultas activas (0 lecturas Firestore)'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAccountModalDefaultType('bank_checking');
                  setIsAccountModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-800/80 hover:bg-emerald-700 text-white font-medium rounded transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Crear Cuenta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Workspace Canvas with react-router-dom Routes */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route 
            path="/" 
            element={
              <Navigate to="/dashboard" replace />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <DashboardOverview
                accounts={accounts}
                transactions={transactions}
                categories={categories}
                activeScope={activeScope}
                activeUserId={activeUserId}
                onNavigateToTransactions={() => navigate('/transactions')}
                onNavigateToAccounts={() => navigate('/accounts')}
                onNavigateToBudgets={() => navigate('/budgets')}
              />
            } 
          />
          <Route 
            path="/accounts" 
            element={
              <AccountsView
                accounts={accounts}
                activeScope={activeScope}
                activeUserId={activeUserId}
                onOpenTransferModal={handleOpenTransferModal}
                onUpdateAccountBalance={handleUpdateAccountBalance}
                onOpenNewAccountModal={(defaultType) => {
                  setAccountModalDefaultType(defaultType || 'bank_checking');
                  setIsAccountModalOpen(true);
                }}
                onDeleteAccount={handleDeleteAccount}
              />
            } 
          />
          <Route 
            path="/transactions" 
            element={
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
                onDeleteTransaction={handleDeleteTransaction}
              />
            } 
          />
          <Route 
            path="/budgets" 
            element={
              <BudgetsView
                accords={accords}
                transactions={transactions}
                categories={categories}
                users={users}
                activeScope={activeScope}
                activeUserId={activeUserId}
                onSaveNewAccord={handleSaveNewAccord}
              />
            } 
          />
          <Route 
            path="/categories" 
            element={
              <CategoriesView
                categories={categories}
                transactions={transactions}
                onAddSubcategory={handleAddSubcategory}
              />
            } 
          />
          <Route 
            path="/architecture" 
            element={
              <SecurityCleView />
            } 
          />
          <Route 
            path="/api-docs" 
            element={
              <ApiDocsView
                accounts={accounts}
                transactions={transactions}
                accords={accords}
              />
            } 
          />
          <Route 
            path="/unit-tests" 
            element={
              <UnitTestsRunner
                categories={categories}
                transactions={transactions}
                accords={accords}
              />
            } 
          />
          <Route 
            path="*" 
            element={
              <Navigate to="/dashboard" replace />
            } 
          />
        </Routes>
      </main>

      {/* Account Creation Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={handleCreateAccount}
        existingAccounts={accounts}
        activeUserId={activeUserId}
        defaultType={accountModalDefaultType}
      />

      {/* Transaction Modal */}
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

      {/* CSV Reconciliation Modal */}
      <CsvReconciliationModal
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        onImportReconciledTransactions={handleImportReconciledTransactions}
        existingTransactions={transactions}
        categories={categories}
        accounts={accounts}
        activeUserId={activeUserId}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Quiet, minimalist footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Plataforma de Gestión Financiera Familiar &amp; Personal</span>
            <span className="text-slate-300">·</span>
            <span>Ledger Inmutable con Hashing SHA-256</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full inline-block ${isRealUser ? 'bg-emerald-500' : 'bg-blue-400'}`}></span>
              <span>{isRealUser ? `Firestore: Ruta /${currentPath}` : 'Modo: Presentación Demo'}</span>
            </span>
            <span>react-router-dom v7</span>
            <span>TLS 1.3</span>
            <span>AES-256-GCM CLE</span>
            <span>Zero-Based Budgeting</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <MainApp />
      </HashRouter>
    </AuthProvider>
  );
}
