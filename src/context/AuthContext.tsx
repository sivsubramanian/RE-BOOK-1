/**
 * AuthContext – Production-ready Supabase Auth with role-based access control
 * 
 * Features:
 * - Real Supabase Auth (email/password) with session persistence
 * - Auto-refresh tokens
 * - College-domain email restriction on signup
 * - Role-based access: buyer / seller / admin
 * - Profile data from profiles table
 */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase, type DbUser } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

/** Allowed college email domains for signup */
const ALLOWED_DOMAINS = [".edu", ".ac.in", ".edu.in"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: DbUser | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: {
    full_name: string;
    department: string;
    semester: number;
    role: 'buyer' | 'seller';
  }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<DbUser>) => Promise<{ error: string | null }>;
  isCollegeEmail: (email: string) => boolean;
  displayName: string | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
  isCollegeEmail: () => false,
  displayName: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch user profile from profiles table */
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) {
      setProfile(data as DbUser);
    }
  }, []);

  /** Initialize session and listen for auth changes */
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  /** Validate college email domain */
  const isCollegeEmail = (email: string): boolean => {
    return ALLOWED_DOMAINS.some(domain => email.toLowerCase().endsWith(domain));
  };

  /** Sign up with email + password + metadata */
  const signUp = async (
    email: string,
    password: string,
    metadata: { full_name: string; department: string; semester: number; role: 'buyer' | 'seller' }
  ): Promise<{ error: string | null }> => {
    // Validate college domain
    if (!isCollegeEmail(email)) {
      return { error: "Please use your college email address (.edu, .ac.in, .edu.in)" };
    }
    // Password strength check
    if (password.length < 8) return { error: "Password must be at least 8 characters" };
    if (!/[A-Z]/.test(password)) return { error: "Password must contain an uppercase letter" };
    if (!/[0-9]/.test(password)) return { error: "Password must contain a number" };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });
    return { error: error?.message ?? null };
  };

  /** Sign in with email + password */
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  /** Sign out */
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  /** Update profile fields */
  const updateProfile = async (data: Partial<DbUser>): Promise<{ error: string | null }> => {
    if (!session?.user) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", session.user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
    }
    return { error: error?.message ?? null };
  };

  const displayName = profile?.full_name || session?.user?.user_metadata?.full_name || null;

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      isCollegeEmail,
      displayName,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
