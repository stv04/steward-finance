import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types/finance';
import { initializeFamilyWithStarterData } from '../services/firestoreService';

export interface ExtendedUserProfile extends UserProfile {
  familyId?: string;
  familyName?: string;
  inviteCode?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: ExtendedUserProfile | null;
  isLoading: boolean;
  isDemoMode: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, fullName: string, familyNameOrCode: string, isJoining: boolean) => Promise<void>;
  loginAsDemoUser: (persona: 'carlos' | 'sofia') => void;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<ExtendedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsDemoMode(false);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            setUserProfile({
              id: user.uid,
              name: data.fullName || user.displayName || user.email?.split('@')[0] || 'Usuario',
              email: user.email || '',
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName || user.email || 'U')}`,
              role: data.role || 'member',
              familyId: data.familyId || 'fam_default_2026',
              familyName: data.familyName || 'Familia Principal',
            });
          } else {
            // Create user profile document if not existing
            const newProfile: ExtendedUserProfile = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Usuario',
              email: user.email || '',
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email || 'U')}`,
              role: 'admin',
              familyId: 'fam_default_2026',
              familyName: 'Familia Principal',
            };
            await setDoc(userDocRef, {
              id: user.uid,
              email: user.email,
              fullName: newProfile.name,
              role: newProfile.role,
              familyId: newProfile.familyId,
              createdAt: new Date().toISOString(),
            });
            setUserProfile(newProfile);
          }
        } catch (err: any) {
          console.warn('Could not read user profile from Firestore:', err);
          setUserProfile({
            id: user.uid,
            name: user.email?.split('@')[0] || 'Usuario',
            email: user.email || '',
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email || 'U')}`,
            role: 'member',
            familyId: 'fam_default_2026',
          });
        }
      } else {
        if (!isDemoMode) {
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión con correo y contraseña.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string, 
    pass: string, 
    fullName: string, 
    familyNameOrCode: string, 
    isJoining: boolean
  ) => {
    setError(null);
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const user = cred.user;
      
      const familyId = isJoining 
        ? (familyNameOrCode.trim() || 'fam_default_2026') 
        : `fam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const familyName = isJoining ? 'Familia Compartida' : familyNameOrCode.trim() || 'Familia ' + fullName.split(' ')[0];

      // Store in users collection
      const userPath = `users/${user.uid}`;
      try {
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          email: user.email,
          fullName: fullName.trim(),
          role: isJoining ? 'member' : 'admin',
          familyId,
          familyName,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }

      // If creating a new family, inherit ONLY starter budget accord and base categories (accounts are created manually)
      if (!isJoining) {
        try {
          await initializeFamilyWithStarterData(familyId, user.uid, familyName);
        } catch (seedErr) {
          console.warn('Initial cloud starter budget notice:', seedErr);
        }
      }

      setUserProfile({
        id: user.uid,
        name: fullName.trim(),
        email: user.email || '',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        role: isJoining ? 'member' : 'admin',
        familyId,
        familyName,
      });

    } catch (err: any) {
      setError(err?.message || 'Error al registrar la cuenta.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemoUser = (persona: 'carlos' | 'sofia') => {
    setIsDemoMode(true);
    if (persona === 'carlos') {
      setUserProfile({
        id: 'usr_carlos',
        name: 'Carlos Mendoza',
        email: 'carlos.m@familia.internal',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'admin',
        familyId: 'fam_default_2026',
        familyName: 'Familia Mendoza Rodríguez',
      });
    } else {
      setUserProfile({
        id: 'usr_sofia',
        name: 'Sofía Rodríguez',
        email: 'sofia.r@familia.internal',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        role: 'member',
        familyId: 'fam_default_2026',
        familyName: 'Familia Mendoza Rodríguez',
      });
    }
  };

  const logout = async () => {
    setIsDemoMode(false);
    setUserProfile(null);
    setCurrentUser(null);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoading,
        isDemoMode,
        loginWithEmail,
        registerWithEmail,
        loginAsDemoUser,
        logout,
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
