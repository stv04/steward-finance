import React, { useState, useEffect, useMemo } from 'react';
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
  AccountType,
  FamilyInfo
} from './types/finance';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { testFirestoreConnection } from './lib/firebase';
import { 
  subscribeToFamilyAccounts, 
  subscribeToFamilyTransactions, 
  subscribeToFamilyBudgetAccords, 
  subscribeToFamilyCategories,
  subscribeToFamilyMembers,
  subscribeToFamilyData,
  createAccountInFirestore,
  deleteAccountFromFirestore,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  saveCategoriesBatchToFirestore,
  saveTransactionToFirestore, 
  updateTransactionInFirestore,
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
import { FamilyMembersModal } from './components/FamilyMembersModal';
import { Cloud, Sparkles, Activity, Plus, ArrowRight } from 'lucide-react';

function MainApp() {
  const { userProfile, currentUser, isDemoMode } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Active current route path normalized (e.g. 'dashboard', 'accounts', 'transactions')
  const currentPath = location.pathname.replace(/^\//, '') || 'dashboard';

  // Active scope and user state (Individual / Personal by default)
  const [users] = useState<UserProfile[]>(INITIAL_USERS);
  const [activeUserId, setActiveUserId] = useState<string>('usr_carlos');
  const [activeScope, setActiveScope] = useState<ScopeType>('personal');

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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [accountModalDefaultType, setAccountModalDefaultType] = useState<AccountType>('bank_checking');
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState<boolean>(false);
  const [txModalInitialType, setTxModalInitialType] = useState<TransactionType>('expense');
  const [txModalInitialOriginAcc, setTxModalInitialOriginAcc] = useState<string | undefined>(undefined);

  // Family Nucleus state
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);

  // Verify connection to Firestore on boot
  useEffect(() => {
    testFirestoreConnection().then(connected => {
      setIsFirestoreConnected(connected);
    });
  }, []);

  const isRealUser = Boolean(currentUser && !isDemoMode && userProfile?.familyId);
  const familyId = userProfile?.familyId;

  // Effective users list:
  // When logged in as a real user, it ONLY shows the members of the family nucleus from Firestore.
  // It NEVER includes mock/test users (Carlos and Sofia) when logged in.
  const effectiveUsers = useMemo(() => {
    if (isRealUser && userProfile) {
      if (familyMembers.length > 0) {
        // Ensure userProfile is in the list with current details
        const exists = familyMembers.some(m => m.id === userProfile.id);
        if (!exists) {
          return [{
            id: userProfile.id,
            name: userProfile.name,
            email: userProfile.email,
            avatar: userProfile.avatar,
            role: (userProfile.role || 'admin') as 'admin' | 'member',
          }, ...familyMembers];
        }
        return familyMembers;
      }
      // Fallback while loading: ONLY show the logged in user, NEVER demo users!
      return [{
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.avatar,
        role: (userProfile.role || 'admin') as 'admin' | 'member',
      }];
    }
    // Only in demo mode or signed out, use mock INITIAL_USERS
    return users;
  }, [isRealUser, userProfile, familyMembers, users]);

  // Update activeUserId when authenticated user changes or effectiveUsers update
  useEffect(() => {
    if (userProfile) {
      setActiveUserId(prev => {
        if (effectiveUsers.some(u => u.id === prev)) {
          return prev;
        }
        return userProfile.id;
      });
    } else {
      setActiveUserId('usr_carlos');
    }
  }, [userProfile, effectiveUsers]);

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

  // 2. TRANSACTIONS Subscription: needed ONLY on '/dashboard', '/transactions', '/categories'
  // (NOT queried when user is on '/accounts', '/budgets', '/architecture', etc.)
  const needsTransactions = isRealUser && ['dashboard', 'transactions', 'categories'].includes(currentPath);

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

  // 4. CATEGORIES Subscription: needed on '/dashboard', '/categories', '/transactions', '/budgets'
  // (NOT queried when user visits '/accounts', '/architecture', '/api-docs', '/unit-tests')
  const needsCategories = isRealUser && ['dashboard', 'categories', 'transactions', 'budgets'].includes(currentPath);

  useEffect(() => {
    if (!needsCategories || !familyId) {
      if (!isRealUser) {
        setCategories(INITIAL_CATEGORIES);
      }
      return;
    }

    setActiveSubscriptions(prev => Array.from(new Set([...prev, 'categories'])));

    const unsub = subscribeToFamilyCategories(familyId, async (cloudCategories) => {
      if (cloudCategories.length > 0) {
        setCategories(cloudCategories);
      } else {
        // Auto-seed baseline categories into Firestore if collection is empty
        try {
          await saveCategoriesBatchToFirestore(familyId, INITIAL_CATEGORIES);
        } catch (err) {
          console.error('Error auto-seeding categories:', err);
        }
      }
    });

    return () => {
      unsub();
      setActiveSubscriptions(prev => prev.filter(s => s !== 'categories'));
    };
  }, [needsCategories, familyId, isRealUser]);

  // 5. FAMILY METADATA & MEMBERS Subscription: real-time family members & invite code
  useEffect(() => {
    if (!isRealUser || !familyId) {
      setFamilyMembers([]);
      setFamilyInfo(null);
      return;
    }

    const unsubFamily = subscribeToFamilyData(familyId, (fInfo) => {
      setFamilyInfo(fInfo);
    });

    const unsubMembers = subscribeToFamilyMembers(familyId, (members) => {
      setFamilyMembers(members);
    });

    return () => {
      unsubFamily();
      unsubMembers();
    };
  }, [isRealUser, familyId]);

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

  // Save or Update Transaction
  const handleSaveTransaction = async (newOrUpdatedTx: Transaction, similarTxIds?: string[]) => {
    if (editingTransaction) {
      const prevTx = transactions.find(t => t.id === newOrUpdatedTx.id) || editingTransaction;

      if (currentUser && !isDemoMode && userProfile?.familyId) {
        try {
          await updateTransactionInFirestore(
            userProfile.familyId,
            newOrUpdatedTx,
            prevTx,
            accounts,
            similarTxIds
          );
        } catch (err) {
          console.error('Firestore update transaction failed:', err);
        }
      }

      // Update transactions state locally
      setTransactions(prev => prev.map(t => {
        if (t.id === newOrUpdatedTx.id) {
          return newOrUpdatedTx;
        }
        if (similarTxIds && similarTxIds.includes(t.id)) {
          return {
            ...t,
            categoryId: newOrUpdatedTx.categoryId,
            subcategoryId: newOrUpdatedTx.subcategoryId,
          };
        }
        return t;
      }));

      // Adjust accounts balance locally if amount, account or type changed
      setAccounts(prevAccounts => {
        // Revert old impact
        let updated = prevAccounts.map(acc => {
          if (prevTx.type === 'expense' && acc.id === prevTx.accountId) {
            return { ...acc, balance: acc.balance + prevTx.amount };
          }
          if (prevTx.type === 'income' && acc.id === prevTx.accountId) {
            return { ...acc, balance: acc.balance - prevTx.amount };
          }
          if (prevTx.type === 'transfer') {
            if (acc.id === prevTx.accountId) return { ...acc, balance: acc.balance + prevTx.amount };
            if (acc.id === prevTx.destinationAccountId) return { ...acc, balance: acc.balance - prevTx.amount };
          }
          return acc;
        });
        // Apply new impact
        updated = updated.map(acc => {
          if (newOrUpdatedTx.type === 'expense' && acc.id === newOrUpdatedTx.accountId) {
            return { ...acc, balance: acc.balance - newOrUpdatedTx.amount };
          }
          if (newOrUpdatedTx.type === 'income' && acc.id === newOrUpdatedTx.accountId) {
            return { ...acc, balance: acc.balance + newOrUpdatedTx.amount };
          }
          if (newOrUpdatedTx.type === 'transfer') {
            if (acc.id === newOrUpdatedTx.accountId) return { ...acc, balance: acc.balance - newOrUpdatedTx.amount };
            if (acc.id === newOrUpdatedTx.destinationAccountId) return { ...acc, balance: acc.balance + newOrUpdatedTx.amount };
          }
          return acc;
        });
        return updated;
      });

      setEditingTransaction(null);
      return;
    }

    // New transaction
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await saveTransactionToFirestore(userProfile.familyId, newOrUpdatedTx, accounts);
      } catch (err) {
        console.error('Firestore save transaction failed:', err);
      }
      return;
    }

    setTransactions(prev => [newOrUpdatedTx, ...prev]);
    setAccounts(prevAccounts => {
      return prevAccounts.map(acc => {
        if (newOrUpdatedTx.type === 'expense' && acc.id === newOrUpdatedTx.accountId) {
          return { ...acc, balance: acc.balance - newOrUpdatedTx.amount };
        }
        if (newOrUpdatedTx.type === 'income' && acc.id === newOrUpdatedTx.accountId) {
          return { ...acc, balance: acc.balance + newOrUpdatedTx.amount };
        }
        if (newOrUpdatedTx.type === 'transfer') {
          if (acc.id === newOrUpdatedTx.accountId) {
            return { ...acc, balance: acc.balance - newOrUpdatedTx.amount };
          }
          if (acc.id === newOrUpdatedTx.destinationAccountId) {
            return { ...acc, balance: acc.balance + newOrUpdatedTx.amount };
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
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  // Categories and Subcategories Handlers (Firestore-backed)
  const handleSaveCategory = async (newOrUpdatedCategory: ParentCategory) => {
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await saveCategoryToFirestore(userProfile.familyId, newOrUpdatedCategory);
      } catch (err) {
        console.error('Firestore save category failed:', err);
      }
      return;
    }

    setCategories(prev => {
      const idx = prev.findIndex(c => c.id === newOrUpdatedCategory.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newOrUpdatedCategory;
        return copy;
      }
      return [...prev, newOrUpdatedCategory];
    });
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await deleteCategoryFromFirestore(userProfile.familyId, categoryId);
      } catch (err) {
        console.error('Firestore delete category failed:', err);
      }
      return;
    }

    setCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const handleAddSubcategory = async (parentId: string, newSubcategoryName: string, historicalAverage: number) => {
    const parentCat = categories.find(c => c.id === parentId);
    if (!parentCat) return;

    const newSub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      parentId,
      name: newSubcategoryName,
      monthlyAverageHistorical: historicalAverage,
    };

    const updatedCategory: ParentCategory = {
      ...parentCat,
      subcategories: [...parentCat.subcategories, newSub],
    };

    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await saveCategoryToFirestore(userProfile.familyId, updatedCategory);
      } catch (err) {
        console.error('Firestore save subcategory failed:', err);
      }
      return;
    }

    setCategories(prev => prev.map(cat => cat.id === parentId ? updatedCategory : cat));
  };

  const handleDeleteSubcategory = async (parentId: string, subcategoryId: string) => {
    const parentCat = categories.find(c => c.id === parentId);
    if (!parentCat) return;

    const updatedCategory: ParentCategory = {
      ...parentCat,
      subcategories: parentCat.subcategories.filter(s => s.id !== subcategoryId),
    };

    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        await saveCategoryToFirestore(userProfile.familyId, updatedCategory);
      } catch (err) {
        console.error('Firestore delete subcategory failed:', err);
      }
      return;
    }

    setCategories(prev => prev.map(cat => cat.id === parentId ? updatedCategory : cat));
  };

  const handleAssignCategoryToTransaction = async (
    txId: string, 
    categoryId: string, 
    subcategoryId: string,
    additionalSimilarTxIds?: string[]
  ) => {
    const allIds = [txId, ...(additionalSimilarTxIds || [])];

    if (currentUser && !isDemoMode && userProfile?.familyId) {
      try {
        for (const id of allIds) {
          const tx = transactions.find(t => t.id === id);
          if (tx) {
            const updatedTx: Transaction = {
              ...tx,
              categoryId,
              subcategoryId,
            };
            await updateTransactionInFirestore(userProfile.familyId, updatedTx, tx, accounts);
          }
        }
      } catch (err) {
        console.error('Firestore assign category failed:', err);
      }
      return;
    }

    setTransactions(prev => prev.map(t => {
      if (allIds.includes(t.id)) {
        return {
          ...t,
          categoryId,
          subcategoryId,
        };
      }
      return t;
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
        users={effectiveUsers}
        userProfile={userProfile}
        familyInfo={familyInfo}
        onNewTransaction={() => {
          setTxModalInitialType('expense');
          setTxModalInitialOriginAcc(undefined);
          setIsTxModalOpen(true);
        }}
        onOpenReconciliation={() => setIsReconciliationModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
      />

      {/* Presentation Mode / Cloud Status Banner */}
      {!isRealUser ? (
        <div className="bg-slate-900 text-white px-4 py-2.5 text-xs border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="font-semibold text-slate-200">{t.nav.demoMode}:</span>
              <span className="text-slate-300">
                {t.nav.presentationBanner}
              </span>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded transition-colors cursor-pointer"
            >
              <span>{t.nav.connectCloud}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        null
      )}

      {/* Main Content Workspace Canvas with react-router-dom Routes */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32 lg:pb-12">
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
                users={effectiveUsers}
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
                users={effectiveUsers}
                activeScope={activeScope}
                activeUserId={activeUserId}
                onNewTransaction={() => {
                  setEditingTransaction(null);
                  setTxModalInitialType('expense');
                  setTxModalInitialOriginAcc(undefined);
                  setIsTxModalOpen(true);
                }}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setIsTxModalOpen(true);
                }}
                onAssignCategoryToTransaction={handleAssignCategoryToTransaction}
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
                users={effectiveUsers}
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
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                onDeleteSubcategory={handleDeleteSubcategory}
                onAssignCategoryToTransaction={handleAssignCategoryToTransaction}
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

      {/* Transaction Modal (Supports both New and Edit with Bulk Similars Propagation) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        accounts={accounts}
        categories={categories}
        users={effectiveUsers}
        existingTransactions={transactions}
        editingTransaction={editingTransaction}
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
        familyInfo={familyInfo}
        onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
      />

      {/* Family Nucleus & Code Management Modal */}
      <FamilyMembersModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        familyInfo={familyInfo}
        familyMembers={effectiveUsers}
        currentUserProfile={userProfile}
      />

      {/* Quiet, minimalist footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto mb-16 lg:mb-0">
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
    <LanguageProvider>
      <AuthProvider>
        <HashRouter>
          <MainApp />
        </HashRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
