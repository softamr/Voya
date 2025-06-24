
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  User as FirebaseUser, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile // Import updateProfile for Firebase Auth
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp, collection, query, where, limit as firestoreLimit, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { USER_ROLES, type UserRole } from '@/lib/constants';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isSuperAdminSetup: boolean;
  login: (email: string, password?: string) => Promise<void>; 
  logout: () => Promise<void>;
  signup: (email: string, password?: string, displayName?: string) => Promise<void>; // For Super Admin setup
  registerGuestUser: (email: string, password?: string, displayName?: string) => Promise<void>; // For general guest signup
  completeSuperAdminSetup: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contextIsInitializing, setContextIsInitializing] = useState(true);
  const [isSuperAdminSetup, setIsSuperAdminSetup] = useState(false);

  useEffect(() => {
    let authUnsubscribe: (() => void) | null = null;
    let isMounted = true;

    const initializeContext = async () => {
      setContextIsInitializing(true);
      try {
        const usersCollectionRef = collection(db, 'users');
        const superAdminQuery = query(usersCollectionRef, where('role', '==', USER_ROLES.SUPER_ADMIN), firestoreLimit(1));
        const querySnapshot = await getDocs(superAdminQuery);
        
        if (isMounted) {
          setIsSuperAdminSetup(!querySnapshot.empty);
        }
      } catch (error) {
        console.error("[AuthContext] Error checking for Super Admin:", error);
        if (isMounted) setIsSuperAdminSetup(false);
      }

      authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (isMounted) {
              if (userDocSnap.exists()) {
                const userProfileData = userDocSnap.data() as UserProfile;
                const createdAtDate = userProfileData.createdAt instanceof Timestamp 
                                    ? userProfileData.createdAt.toDate() 
                                    : userProfileData.createdAt;
                
                const finalUserProfile = { ...userProfileData, createdAt: createdAtDate, uid: firebaseUser.uid };
                setUser(finalUserProfile);
              } else {
                await signOut(auth); 
                setUser(null);
              }
            }
          } catch (error) {
            console.error("[AuthContext] Error fetching Firestore profile:", error);
            if (isMounted) {
              await signOut(auth); 
              setUser(null); 
            }
          }
        } else {
          if (isMounted) setUser(null);
        }
        if (isMounted) setContextIsInitializing(false);
      });
    };

    initializeContext();
    return () => {
      isMounted = false;
      if (authUnsubscribe) authUnsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string) => {
    if (!password) throw new Error("Password is required for login.");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        await signOut(auth); 
        const profileError = new Error("User profile not found.");
        (profileError as any).code = "auth/profile-not-found"; 
        throw profileError;
      }
    } catch (error) {
      console.error("[AuthContext] Login error:", error);
      if (error instanceof Error) throw error; 
      throw new Error("Unknown login error.");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null); 
    } catch (error) {
      console.error("[AuthContext] Logout error:", error);
      if (error instanceof Error) throw new Error(error.message || "Failed to logout.");
      throw new Error("Unknown logout error.");
    }
  };
  
  const signup = async (email: string, password?: string, displayName?: string) => { // For Super Admin
    if (!password) throw new Error("Password is required for signup.");
    let firebaseAuthUser: FirebaseUser | null = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseAuthUser = userCredential.user;

      if (firebaseAuthUser.displayName !== displayName && displayName) {
        await updateFirebaseProfile(firebaseAuthUser, { displayName });
      }

      const newUserProfile: UserProfile = {
        uid: firebaseAuthUser.uid, email: firebaseAuthUser.email!,
        role: USER_ROLES.SUPER_ADMIN,
        displayName: displayName || firebaseAuthUser.email || 'Super Admin',
        createdAt: Timestamp.fromDate(new Date()),
      };
      await setDoc(doc(db, 'users', firebaseAuthUser.uid), newUserProfile);
      setIsSuperAdminSetup(true);
    } catch (error) {
      console.error("[AuthContext] Super Admin signup error:", error);
      if (error instanceof Error) throw error;
      throw new Error("Unknown Super Admin signup error.");
    }
  };

  const registerGuestUser = async (email: string, password?: string, displayName?: string) => {
    if (!password) throw new Error("Password is required for guest registration.");
    let firebaseAuthUser: FirebaseUser | null = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseAuthUser = userCredential.user;

      if (firebaseAuthUser.displayName !== displayName && displayName) {
        await updateFirebaseProfile(firebaseAuthUser, { displayName });
      }
      
      const newUserProfile: UserProfile = {
        uid: firebaseAuthUser.uid, email: firebaseAuthUser.email!,
        role: USER_ROLES.AUTHENTICATED_USER, // Changed from GUEST to AUTHENTICATED_USER
        displayName: displayName || firebaseAuthUser.email || 'Registered User', // Updated default name
        createdAt: Timestamp.fromDate(new Date()),
      };
      await setDoc(doc(db, 'users', firebaseAuthUser.uid), newUserProfile);
      // onAuthStateChanged will update the user state
    } catch (error) {
      console.error("[AuthContext] Guest registration error:", error);
      if (error instanceof Error) throw error;
      throw new Error("Unknown guest registration error.");
    }
  };

  const completeSuperAdminSetup = () => {
    setIsSuperAdminSetup(true);
  };

  return (
    <AuthContext.Provider value={{ user, loading: contextIsInitializing, login, logout, signup, registerGuestUser, isSuperAdminSetup, completeSuperAdminSetup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

