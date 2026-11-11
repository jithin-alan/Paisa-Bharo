import { useEffect, useState } from 'react';
import { onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';

async function checkAdminStatus(user: FirebaseUser): Promise<boolean> {
  // Check custom claims (production approach)
  const result = await user.getIdTokenResult();
  return result.claims.admin === true;
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