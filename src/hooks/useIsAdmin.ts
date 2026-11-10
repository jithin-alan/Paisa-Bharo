import { useEffect, useState } from 'react';
import { onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// Admin email addresses - useful for development/testing
const ADMIN_EMAILS = ['admin@paisabharo.com', 'stickadmob@gmail.com'];

async function checkAdminStatus(user: FirebaseUser) {
  // Check custom claims first (production approach)
  const result = await user.getIdTokenResult();
  const hasCustomClaim = result.claims.admin === true;

  // Check if user email is in the admin email list (for development/testing)
  const isAdminEmail = ADMIN_EMAILS.includes(user.email || '');

  // Also check Firestore admins collection (development/simulation approach)
  let isInAdminsCollection = false;
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    isInAdminsCollection = adminDoc.exists();
  } catch {
    // Firestore check failed, skip
  }

  const finalResult = hasCustomClaim || isAdminEmail || isInAdminsCollection;

  // Debug logging
  console.log('🔍 Admin check details:', {
    email: user.email,
    uid: user.uid,
    hasCustomClaim,
    isAdminEmail,
    isInAdminsCollection,
    finalResult
  });

  // Admin if any of these conditions are met
  return finalResult;
}

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check immediately on mount if user is already authenticated
    const initialCheck = async () => {
      const user = auth.currentUser;
      if (user && mounted) {
        const adminStatus = await checkAdminStatus(user);
        setIsAdmin(adminStatus);
        setChecked(true);
      } else if (!user && mounted) {
        setChecked(true);
      }
    };
    initialCheck();

    // Also listen for token changes (sign in, refresh, etc.)
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!mounted) return;

      if (!user) {
        setIsAdmin(false);
        setChecked(true);
        return;
      }

      const adminStatus = await checkAdminStatus(user);
      setIsAdmin(adminStatus);
      setChecked(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { isAdmin, checked };
}