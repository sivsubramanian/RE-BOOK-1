/**
 * AuthContext – JWT-based authentication with role-based access control
 * 
 * Features:
 * - JWT token stored in localStorage
 * - College-domain email restriction on signup
 * - Role-based access: buyer / seller / admin
 * - Profile data from Express backend
 */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { apiFetch, getToken, setToken, clearToken } from "@/lib/api";
import type { DbUser } from "@/types";

/** Allowed college email domains for signup */
const ALLOWED_DOMAINS = [".edu", ".ac.in", ".edu.in"];

/** Minimal user type for auth context (replaces Supabase User) */
interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  session: string | null;  // JWT token (non-null when logged in)
  user: AuthUser | null;
  profile: DbUser | null;
  loading: boolean;
  loggingOut: boolean;
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
  loggingOut: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
  isCollegeEmail: () => false,
  displayName: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  /** Fetch user profile from backend */
  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiFetch<DbUser>("/auth/me");
      setProfile(data);
      setUser({ id: data.id, email: data.email });
    } catch {
      // Token invalid/expired — clear auth state
      clearToken();
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  /** Initialize from stored JWT token */
  useEffect(() => {
    const token = getToken();
    if (token) {
      setSession(token);
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
    try {
      const data = await apiFetch<{ token: string; user: DbUser }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, ...metadata }),
        noAuth: true,
      });
      setToken(data.token);
      setSession(data.token);
      setProfile(data.user);
      setUser({ id: data.user.id, email: data.user.email });
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : "Signup failed" };
    }
  };

  /** Sign in with email + password */
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const data = await apiFetch<{ token: string; user: DbUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        noAuth: true,
      });
      setToken(data.token);
      setSession(data.token);
      setProfile(data.user);
      setUser({ id: data.user.id, email: data.user.email });
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : "Login failed" };
    }
  };

  /** Sign out – clears all auth state */
  const signOut = async () => {
    setLoggingOut(true);
    try {
      clearToken();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoggingOut(false);
    }
  };

  /** Update profile fields */
  const updateProfile = async (data: Partial<DbUser>): Promise<{ error: string | null }> => {
    if (!session) return { error: "Not authenticated" };
    try {
      const updated = await apiFetch<DbUser>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setProfile(updated);
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : "Update failed" };
    }
  };

  const displayName = profile?.full_name || null;

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      loading,
      loggingOut,
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
