import { createContext, useContext, useEffect, useState, ReactNode } from "react";
interface User { id?: string; user_metadata?: any }
interface Session { user?: User }

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  displayName: string | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  displayName: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    // Demo-only: read current user from localStorage
    const local = localStorage.getItem("rebook_current_user");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed?.fullName) setDisplayName(parsed.fullName);
      } catch (e) {}
    }
    setLoading(false);
  }, []);

  const signOut = async () => {
    localStorage.removeItem("rebook_current_user");
    setDisplayName(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut, displayName }}>
      {children}
    </AuthContext.Provider>
  );
};
