import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FinancialAccount, Transaction, BudgetAccord, ParentCategory } from '../types/finance';
import { INITIAL_BUDGET_ACCORDS } from '../data/mockData';

/**
 * Sanitizes an object by removing undefined fields to satisfy Firestore payload constraints
 */
export function cleanFirestorePayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanFirestorePayload(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Real-time listener for Family Accounts
 */
export function subscribeToFamilyAccounts(
  familyId: string,
  onUpdate: (accounts: FinancialAccount[]) => void
): () => void {
  const accountsPath = `families/${familyId}/accounts`;
  const colRef = collection(db, 'families', familyId, 'accounts');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FinancialAccount[] = snapshot.docs.map(d => ({
        ...d.data() as FinancialAccount,
        id: d.id,
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, accountsPath);
    }
  );
}

/**
 * Real-time listener for Family Transactions (Ledger)
 */
export function subscribeToFamilyTransactions(
  familyId: string,
  onUpdate: (transactions: Transaction[]) => void
): () => void {
  const txPath = `families/${familyId}/transactions`;
  const q = query(
    collection(db, 'families', familyId, 'transactions'),
    orderBy('date', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = snapshot.docs.map(d => ({
        ...d.data() as Transaction,
        id: d.id,
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, txPath);
    }
  );
}

/**
 * Real-time listener for Budget Accords
 */
export function subscribeToFamilyBudgetAccords(
  familyId: string,
  onUpdate: (accords: BudgetAccord[]) => void
): () => void {
  const accordsPath = `families/${familyId}/budgetAccords`;
  const colRef = collection(db, 'families', familyId, 'budgetAccords');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: BudgetAccord[] = snapshot.docs.map(d => ({
        ...d.data() as BudgetAccord,
        id: d.id,
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, accordsPath);
    }
  );
}

/**
 * Creates or saves a new Financial Account in Firestore
 */
export async function createAccountInFirestore(
  familyId: string,
  account: FinancialAccount
): Promise<void> {
  const accPath = `families/${familyId}/accounts/${account.id}`;
  const accRef = doc(db, 'families', familyId, 'accounts', account.id);

  try {
    const payload = cleanFirestorePayload({
      ...account,
      familyId,
      createdAt: new Date().toISOString(),
    });
    await setDoc(accRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, accPath);
  }
}

/**
 * Deletes an account from Firestore
 */
export async function deleteAccountFromFirestore(
  familyId: string,
  accountId: string
): Promise<void> {
  const accPath = `families/${familyId}/accounts/${accountId}`;
  const accRef = doc(db, 'families', familyId, 'accounts', accountId);

  try {
    await deleteDoc(accRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, accPath);
  }
}

/**
 * Saves a new transaction to Firestore and updates account balances atomically
 */
export async function saveTransactionToFirestore(
  familyId: string,
  tx: Transaction,
  currentAccounts: FinancialAccount[]
): Promise<void> {
  const txPath = `families/${familyId}/transactions/${tx.id}`;
  const batch = writeBatch(db);

  // 1. Write cleaned transaction document
  const txRef = doc(db, 'families', familyId, 'transactions', tx.id);
  const payload = cleanFirestorePayload({
    ...tx,
    familyId,
    createdAt: tx.createdAt || new Date().toISOString(),
  });
  batch.set(txRef, payload, { merge: true });

  // 2. Adjust account balances
  const originAcc = currentAccounts.find(a => a.id === tx.accountId);
  if (originAcc) {
    const accRef = doc(db, 'families', familyId, 'accounts', originAcc.id);
    let newBalance = originAcc.balance;
    if (tx.type === 'expense') {
      newBalance = originAcc.balance - tx.amount;
    } else if (tx.type === 'income') {
      newBalance = originAcc.balance + tx.amount;
    } else if (tx.type === 'transfer') {
      newBalance = originAcc.balance - tx.amount;
    }
    batch.set(accRef, { balance: newBalance }, { merge: true });
  }

  // If transfer, adjust destination account
  if (tx.type === 'transfer' && tx.destinationAccountId) {
    const destAcc = currentAccounts.find(a => a.id === tx.destinationAccountId);
    if (destAcc) {
      const destRef = doc(db, 'families', familyId, 'accounts', destAcc.id);
      batch.set(destRef, { balance: destAcc.balance + tx.amount }, { merge: true });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, txPath);
  }
}

/**
 * Bulk imports reconciled transactions to Firestore
 */
export async function bulkImportTransactionsToFirestore(
  familyId: string,
  txs: Transaction[],
  currentAccounts: FinancialAccount[]
): Promise<void> {
  const batch = writeBatch(db);
  const accountBalanceDeltas = new Map<string, number>();

  for (const tx of txs) {
    const txRef = doc(db, 'families', familyId, 'transactions', tx.id);
    const payload = cleanFirestorePayload({
      ...tx,
      familyId,
      createdAt: tx.createdAt || new Date().toISOString(),
    });
    batch.set(txRef, payload, { merge: true });

    const delta = tx.type === 'expense' ? -tx.amount : (tx.type === 'income' ? tx.amount : 0);
    const prevDelta = accountBalanceDeltas.get(tx.accountId) || 0;
    accountBalanceDeltas.set(tx.accountId, prevDelta + delta);
  }

  // Apply deltas to accounts
  for (const [accId, delta] of accountBalanceDeltas.entries()) {
    const acc = currentAccounts.find(a => a.id === accId);
    if (acc) {
      const accRef = doc(db, 'families', familyId, 'accounts', accId);
      batch.set(accRef, { balance: acc.balance + delta }, { merge: true });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `families/${familyId}/transactions`);
  }
}

/**
 * Updates an account balance or settings in Firestore
 */
export async function updateAccountInFirestore(
  familyId: string,
  accountId: string,
  updates: Partial<FinancialAccount>
): Promise<void> {
  const accPath = `families/${familyId}/accounts/${accountId}`;
  const accRef = doc(db, 'families', familyId, 'accounts', accountId);

  try {
    const payload = cleanFirestorePayload(updates);
    await setDoc(accRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, accPath);
  }
}

/**
 * Saves a new budget accord to Firestore
 */
export async function saveBudgetAccordToFirestore(
  familyId: string,
  accord: BudgetAccord
): Promise<void> {
  const accordPath = `families/${familyId}/budgetAccords/${accord.id}`;
  const accordRef = doc(db, 'families', familyId, 'budgetAccords', accord.id);

  try {
    const payload = cleanFirestorePayload({
      ...accord,
      familyId,
      createdAt: accord.createdAt || new Date().toISOString(),
    });
    await setDoc(accordRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, accordPath);
  }
}

/**
 * Deletes a transaction from Firestore
 */
export async function deleteTransactionFromFirestore(
  familyId: string,
  txId: string
): Promise<void> {
  const txPath = `families/${familyId}/transactions/${txId}`;
  const txRef = doc(db, 'families', familyId, 'transactions', txId);

  try {
    await deleteDoc(txRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, txPath);
  }
}

/**
 * Seeds initial family financial starter base into Firestore.
 * User requirement: Inherits ONLY the continuous budget accord (which can be edited later)
 * and base categories as a starting baseline.
 * ACCOUNTS and TRANSACTIONS are NOT pre-seeded: the user creates their own accounts manually.
 */
export async function initializeFamilyWithStarterData(
  familyId: string,
  currentUserId: string,
  familyName: string = 'Familia Principal'
): Promise<void> {
  const batch = writeBatch(db);

  // 1. Create or ensure family document
  const famRef = doc(db, 'families', familyId);
  batch.set(famRef, {
    id: familyId,
    name: familyName,
    createdBy: currentUserId,
    inviteCode: `FAM-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  // 2. Inherit only the starter Budget Accord with continuous zero-based budgeting rules
  for (const accord of INITIAL_BUDGET_ACCORDS) {
    const accordRef = doc(db, 'families', familyId, 'budgetAccords', accord.id);
    const cleanAccord = cleanFirestorePayload({
      ...accord,
      familyId,
      createdByUserId: currentUserId,
      createdAt: accord.createdAt || new Date().toISOString(),
    });
    batch.set(accordRef, cleanAccord, { merge: true });
  }

  // Note: Accounts and transactions are NOT populated. The user creates accounts manually.

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `families/${familyId}`);
  }
}

// Backwards compatibility alias
export const initializeFamilyWithSeedData = initializeFamilyWithStarterData;
