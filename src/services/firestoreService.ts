import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch, 
  query, 
  orderBy, 
  where, 
  QueryConstraint, 
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FinancialAccount, Transaction, BudgetAccord, ParentCategory, UserProfile, FamilyInfo } from '../types/finance';
import { INITIAL_BUDGET_ACCORDS, INITIAL_CATEGORIES } from '../data/mockData';
import { normalizeAndValidateDate } from '../utils/dateUtils';

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
 * Real-time listener for Categories and Subcategories
 */
export function subscribeToFamilyCategories(
  familyId: string,
  onUpdate: (categories: ParentCategory[]) => void
): () => void {
  const categoriesPath = `families/${familyId}/categories`;
  const colRef = collection(db, 'families', familyId, 'categories');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ParentCategory[] = snapshot.docs.map(d => ({
        ...d.data() as ParentCategory,
        id: d.id,
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, categoriesPath);
    }
  );
}

/**
 * Saves or updates a Category (with its subcategories) in Firestore
 */
export async function saveCategoryToFirestore(
  familyId: string,
  category: ParentCategory
): Promise<void> {
  const catPath = `families/${familyId}/categories/${category.id}`;
  const catRef = doc(db, 'families', familyId, 'categories', category.id);

  try {
    const payload = cleanFirestorePayload({
      ...category,
      familyId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(catRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, catPath);
  }
}

/**
 * Deletes a category from Firestore
 */
export async function deleteCategoryFromFirestore(
  familyId: string,
  categoryId: string
): Promise<void> {
  const catPath = `families/${familyId}/categories/${categoryId}`;
  const catRef = doc(db, 'families', familyId, 'categories', categoryId);

  try {
    await deleteDoc(catRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, catPath);
  }
}

/**
 * Batch saves categories to Firestore (for seeding or importing)
 */
export async function saveCategoriesBatchToFirestore(
  familyId: string,
  categories: ParentCategory[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const cat of categories) {
    const catRef = doc(db, 'families', familyId, 'categories', cat.id);
    const payload = cleanFirestorePayload({
      ...cat,
      familyId,
      updatedAt: new Date().toISOString(),
    });
    batch.set(catRef, payload, { merge: true });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `families/${familyId}/categories`);
  }
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
 * Updates a transaction in Firestore with atomic balance recalculation
 * and optional bulk category/subcategory propagation to similar transactions
 */
export async function updateTransactionInFirestore(
  familyId: string,
  updatedTx: Transaction,
  previousTx: Transaction,
  currentAccounts: FinancialAccount[],
  similarTxIdsToUpdateCategory?: string[]
): Promise<void> {
  const txPath = `families/${familyId}/transactions/${updatedTx.id}`;
  const batch = writeBatch(db);

  // 1. Set updated transaction document
  const txRef = doc(db, 'families', familyId, 'transactions', updatedTx.id);
  const payload = cleanFirestorePayload({
    ...updatedTx,
    familyId,
    updatedAt: new Date().toISOString(),
  });
  batch.set(txRef, payload, { merge: true });

  const accountDeltas = getAccountDeltasOnTransactionUpdate(previousTx, updatedTx);

  // Apply deltas to accounts
  for (const [accId, delta] of accountDeltas.entries()) {
    if (delta !== 0) {
      const acc = currentAccounts.find(a => a.id === accId);
      if (acc) {
        const accRef = doc(db, 'families', familyId, 'accounts', accId);
        batch.set(accRef, { balance: acc.balance + delta }, { merge: true });
      }
    }
  }

  // 3. Propagate Category/Subcategory to similar transactions if requested by user
  if (similarTxIdsToUpdateCategory && similarTxIdsToUpdateCategory.length > 0) {
    for (const simId of similarTxIdsToUpdateCategory) {
      const simRef = doc(db, 'families', familyId, 'transactions', simId);
      batch.update(simRef, {
        categoryId: updatedTx.categoryId,
        subcategoryId: updatedTx.subcategoryId,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, txPath);
  }
}

function getAccountDeltasOnTransactionUpdate(previousTx: Transaction, updatedTx?: Transaction) {
  // 2. Calculate account balance corrections
  // Revert previous transaction impact
  const accountDeltas = new Map<string, number>();

  const getRevertDelta = (tx: Transaction, isDestination = false): number => {
    if (isDestination && tx.type === 'transfer') {
      return -tx.amount; // Revert transfer arrival
    }
    if (tx.type === 'expense') return tx.amount; // Revert spending
    if (tx.type === 'income') return -tx.amount; // Revert income
    if (tx.type === 'transfer') return tx.amount; // Revert transfer departure
    return 0;
  };

  const getApplyDelta = (tx: Transaction, isDestination = false): number => {
    if (isDestination && tx.type === 'transfer') {
      return tx.amount; // Apply transfer arrival
    }
    if (tx.type === 'expense') return -tx.amount; // Apply spending
    if (tx.type === 'income') return tx.amount; // Apply income
    if (tx.type === 'transfer') return -tx.amount; // Apply transfer departure
    return 0;
  };

  // Revert previous origin account
  const prevOrigAcc = previousTx.accountId;
  accountDeltas.set(prevOrigAcc, (accountDeltas.get(prevOrigAcc) || 0) + getRevertDelta(previousTx));

  // Revert previous destination account if transfer
  if (previousTx.type === 'transfer' && previousTx.destinationAccountId) {
    const prevDest = previousTx.destinationAccountId;
    accountDeltas.set(prevDest, (accountDeltas.get(prevDest) || 0) + getRevertDelta(previousTx, true));
  }

  if(updatedTx) {
    // Apply new origin account
    const newOrigAcc = updatedTx.accountId;
    accountDeltas.set(newOrigAcc, (accountDeltas.get(newOrigAcc) || 0) + getApplyDelta(updatedTx));
  
    // Apply new destination account if transfer
    if (updatedTx.type === 'transfer' && updatedTx.destinationAccountId) {
      const newDest = updatedTx.destinationAccountId;
      accountDeltas.set(newDest, (accountDeltas.get(newDest) || 0) + getApplyDelta(updatedTx, true));
    }
  }

  return accountDeltas;
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

  console.log(accountBalanceDeltas);

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
  const batch = writeBatch(db);

  try {
    const transaction = (await getDoc(txRef)).data() as Transaction;
    
    batch.delete(txRef);

    const accountDeltas = getAccountDeltasOnTransactionUpdate(transaction);
    for (const [accId, delta] of accountDeltas.entries()) {
        const accRef = doc(db, 'families', familyId, 'accounts', accId);
        const accSnap = await getDoc(accRef);
        if (accSnap.exists()) {
          const acc = accSnap.data();
          batch.set(accRef, { balance: (acc?.balance ?? 0) + delta }, { merge: true });
        }
    }

    batch.commit();
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
  const inviteCode = `FAM-${Math.floor(1000 + Math.random() * 9000)}`;
  batch.set(famRef, {
    id: familyId,
    name: familyName,
    createdBy: currentUserId,
    inviteCode,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  // 1.1 Add creator as admin member in family members subcollection
  const memberRef = doc(db, 'families', familyId, 'members', currentUserId);
  batch.set(memberRef, {
    id: currentUserId,
    name: familyName.replace(/^Familia\s*/i, '') || 'Administrador',
    role: 'admin',
    joinedAt: new Date().toISOString(),
  }, { merge: true });

  // 2. Inherit starter Budget Accord with continuous zero-based budgeting rules
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

  // 3. Inherit starter Categories and Subcategories into Firestore
  for (const cat of INITIAL_CATEGORIES) {
    const catRef = doc(db, 'families', familyId, 'categories', cat.id);
    const cleanCat = cleanFirestorePayload({
      ...cat,
      familyId,
      createdAt: new Date().toISOString(),
    });
    batch.set(catRef, cleanCat, { merge: true });
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

/**
 * Real-time listener for Family Document metadata (name, inviteCode, etc.)
 */
export function subscribeToFamilyData(
  familyId: string,
  onUpdate: (family: FamilyInfo | null) => void
): () => void {
  const famPath = `families/${familyId}`;
  const famRef = doc(db, 'families', familyId);

  return onSnapshot(
    famRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          id: snap.id,
          name: data.name || 'Familia Principal',
          inviteCode: data.inviteCode || snap.id,
          createdBy: data.createdBy || '',
          createdAt: data.createdAt,
        });
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, famPath);
    }
  );
}

/**
 * Real-time listener for Family Members
 * Queries both families/{familyId}/members subcollection and users collection matching familyId
 */
export function subscribeToFamilyMembers(
  familyId: string,
  onUpdate: (members: UserProfile[]) => void
): () => void {
  const membersPath = `families/${familyId}/members`;
  const colRef = collection(db, 'families', familyId, 'members');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      const subMembers: UserProfile[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || data.fullName || 'Miembro',
          email: data.email || '',
          avatar: data.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name || d.id)}`,
          role: (data.role || 'member') as 'admin' | 'member',
          joinedAt: data.joinedAt,
          status: data.status,
        };
      });

      // Also merge with any users in users collection with familyId
      try {
        const usersQ = query(collection(db, 'users'), where('familyId', '==', familyId));
        const usersSnap = await getDocs(usersQ);
        const map = new Map<string, UserProfile>();
        for (const m of subMembers) map.set(m.id, m);

        for (const uDoc of usersSnap.docs) {
          const uData = uDoc.data();
          if (!map.has(uDoc.id)) {
            map.set(uDoc.id, {
              id: uDoc.id,
              name: uData.fullName || uData.name || 'Miembro',
              email: uData.email || '',
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(uData.fullName || uData.email || uDoc.id)}`,
              role: (uData.role || 'member') as 'admin' | 'member',
              joinedAt: uData.createdAt,
            });
          }
        }
        onUpdate(Array.from(map.values()));
      } catch (err) {
        onUpdate(subMembers);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, membersPath);
    }
  );
}

/**
 * Adds or invites a member to the family nucleus. Only admins should call this.
 */
export async function addMemberToFamily(
  familyId: string,
  familyName: string,
  memberEmail: string,
  memberName?: string,
  role: 'admin' | 'member' = 'member'
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = memberEmail.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, message: 'El correo electrónico es obligatorio.' };
  }

  try {
    // 1. Check if user already exists with this email in users collection
    const usersQ = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const userSnap = await getDocs(usersQ);

    if (!userSnap.empty) {
      const targetUserDoc = userSnap.docs[0];
      const targetUserId = targetUserDoc.id;
      const targetData = targetUserDoc.data();

      // Update their user document to attach to this family
      await setDoc(doc(db, 'users', targetUserId), {
        familyId,
        familyName,
        role,
      }, { merge: true });

      // Add to members subcollection
      await setDoc(doc(db, 'families', familyId, 'members', targetUserId), {
        id: targetUserId,
        name: targetData.fullName || memberName || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetData.fullName || cleanEmail)}`,
        role,
        joinedAt: new Date().toISOString(),
      }, { merge: true });

      return {
        success: true,
        message: `El usuario ${targetData.fullName || cleanEmail} ha sido vinculado al núcleo familiar exitosamente.`,
      };
    } else {
      // User is not yet registered: register an invited member placeholder
      const inviteId = `invite_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await setDoc(doc(db, 'families', familyId, 'members', inviteId), {
        id: inviteId,
        name: memberName?.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberName || cleanEmail)}`,
        role,
        status: 'invited',
        joinedAt: new Date().toISOString(),
      }, { merge: true });

      return {
        success: true,
        message: `Invitación registrada para ${cleanEmail}. Al registrarse o ingresar el código familiar se conectará de inmediato.`,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `families/${familyId}/members`);
    return { success: false, message: 'Ocurrió un error al agregar el miembro al núcleo.' };
  }
}

/**
 * Removes a member from the family nucleus. Only admins can execute this.
 */
export async function removeMemberFromFamily(
  familyId: string,
  memberUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Remove from members subcollection
    const memberDocRef = doc(db, 'families', familyId, 'members', memberUserId);
    await deleteDoc(memberDocRef);

    // 2. If it's a real user document (not just an invite placeholder), detach their familyId in users collection
    if (!memberUserId.startsWith('invite_')) {
      const userRef = doc(db, 'users', memberUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await setDoc(userRef, {
          familyId: `fam_detached_${memberUserId}`,
          familyName: 'Familia Individual',
          role: 'admin',
        }, { merge: true });
      }
    }

    return {
      success: true,
      message: 'Miembro retirado del núcleo familiar correctamente.',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `families/${familyId}/members/${memberUserId}`);
    return { success: false, message: 'No se pudo retirar el miembro del núcleo.' };
  }
}

/**
 * Allows a user to join an existing family by entering the Family Code or ID
 */
export async function joinFamilyByCode(
  userId: string,
  userFullName: string,
  userEmail: string,
  codeOrId: string
): Promise<{ success: boolean; familyId: string; familyName: string; message: string }> {
  const trimmed = codeOrId.trim();
  if (!trimmed) {
    return { success: false, familyId: '', familyName: '', message: 'Introduce un código válido.' };
  }

  try {
    // 1. Search by inviteCode
    const q1 = query(collection(db, 'families'), where('inviteCode', '==', trimmed));
    const snap = await getDocs(q1);

    // 2. Fallback search by ID
    if (snap.empty) {
      const docRef = doc(db, 'families', trimmed);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const famData = docSnap.data();
        const familyId = docSnap.id;
        const familyName = famData.name || 'Familia Compartida';

        // Update user profile doc
        await setDoc(doc(db, 'users', userId), {
          familyId,
          familyName,
          role: 'member',
        }, { merge: true });

        // Add to family members
        await setDoc(doc(db, 'families', familyId, 'members', userId), {
          id: userId,
          name: userFullName,
          email: userEmail,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userFullName || userEmail)}`,
          role: 'member',
          joinedAt: new Date().toISOString(),
        }, { merge: true });

        return {
          success: true,
          familyId,
          familyName,
          message: `¡Te has vinculado exitosamente al núcleo "${familyName}"!`,
        };
      }
    } else {
      const famDoc = snap.docs[0];
      const familyId = famDoc.id;
      const familyName = famDoc.data().name || 'Familia Compartida';

      // Update user profile doc
      await setDoc(doc(db, 'users', userId), {
        familyId,
        familyName,
        role: 'member',
      }, { merge: true });

      // Add to family members
      await setDoc(doc(db, 'families', familyId, 'members', userId), {
        id: userId,
        name: userFullName,
        email: userEmail,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userFullName || userEmail)}`,
        role: 'member',
        joinedAt: new Date().toISOString(),
      }, { merge: true });

      return {
        success: true,
        familyId,
        familyName,
        message: `¡Te has vinculado exitosamente al núcleo "${familyName}"!`,
      };
    }

    return {
      success: false,
      familyId: '',
      familyName: '',
      message: 'No se encontró ningún núcleo familiar con ese código de invitación.',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'families');
    return { success: false, familyId: '', familyName: '', message: 'Error al buscar el código familiar.' };
  }
}
