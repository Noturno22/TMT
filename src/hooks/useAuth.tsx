import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { buildTestUser, clearTestPhone, getTestPhone, saveTestPhone } from '@/lib/testAuth';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  signInTest: (phone: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  initializing: true,
  signInTest: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.all([supabase.auth.getSession(), getTestPhone()]).then(
      ([{ data: { session } }, testPhone]) => {
        if (!mounted) return;
        setUser(session?.user ?? (testPhone ? buildTestUser(testPhone) : null));
        setInitializing(false);
      },
    );

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
      } else {
        getTestPhone().then((testPhone) => {
          if (!mounted) return;
          setUser(testPhone ? buildTestUser(testPhone) : null);
        });
      }
      setInitializing(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInTest = useCallback(async (phone: string) => {
    await saveTestPhone(phone);
    setUser(buildTestUser(phone));
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([supabase.auth.signOut().catch(() => {}), clearTestPhone()]);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, signInTest, signOut }),
    [user, initializing, signInTest, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
