import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Book, Mail, Lock, User, ArrowRight, Sparkles } from "lucide-react";
// Demo auth (localStorage) — Supabase integrations removed
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Demo flow: persist users to localStorage
    setTimeout(() => {
      if (isLogin) {
        const usersRaw = localStorage.getItem("rebook_users") || "{}";
        try {
          const users = JSON.parse(usersRaw);
          const full = users[email]?.fullName || null;
          localStorage.setItem("rebook_current_user", JSON.stringify({ email, fullName: full }));
        } catch (e) {
          localStorage.setItem("rebook_current_user", JSON.stringify({ email, fullName: null }));
        }
        toast.success("Welcome back to ReBook!");
        navigate("/home");
      } else {
        const usersRaw = localStorage.getItem("rebook_users") || "{}";
        let users = {} as any;
        try { users = JSON.parse(usersRaw); } catch (e) { users = {}; }
        users[email] = { fullName };
        localStorage.setItem("rebook_users", JSON.stringify(users));
        localStorage.setItem("rebook_current_user", JSON.stringify({ email, fullName }));
        toast.success("Account created successfully!");
        navigate("/home");
      }
      setLoading(false);
    }, 800);

    /* Original Supabase authentication (commented out for demo)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back to ReBook!");
        navigate("/");
      } else {
        if (!email.endsWith(".edu") && !email.endsWith(".ac.in") && !email.endsWith(".edu.in")) {
          toast.error("Please use your college email address (.edu, .ac.in, .edu.in)");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your college email to verify your account!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
    */
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 pt-16 sm:pt-20 pb-8 sm:pb-10">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-[80px] sm:blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-56 sm:w-80 h-56 sm:h-80 bg-primary/5 rounded-full blur-[60px] sm:blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4"
          >
            <img src="/bg removed logo.png" alt="ReBook Logo" className="w-12 h-12 sm:w-16 sm:h-16" />
            <span className="font-display text-2xl sm:text-3xl font-bold gradient-text">ReBook</span>
          </motion.div>
          <p className="text-muted-foreground text-xs sm:text-sm">Reuse. Resell. Relearn.</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-border/50">
          {/* Toggle */}
          <div className="flex bg-muted/30 rounded-xl sm:rounded-2xl p-1 mb-6 sm:mb-8">
            {["Login", "Sign Up"].map((tab, i) => (
              <button
                key={tab}
                onClick={() => setIsLogin(i === 0)}
                className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                  (i === 0 ? isLogin : !isLogin)
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleAuth}
              className="space-y-3.5 sm:space-y-5"
            >
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <Input
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9 sm:pl-11 h-10 sm:h-12 rounded-lg sm:rounded-xl text-xs sm:text-base bg-muted/30 border-border/50 focus:border-primary/50"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={isLogin ? "Email address" : "College email (.edu)"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 sm:pl-11 h-10 sm:h-12 rounded-lg sm:rounded-xl text-xs sm:text-base bg-muted/30 border-border/50 focus:border-primary/50"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 sm:pl-11 h-10 sm:h-12 rounded-lg sm:rounded-xl text-xs sm:text-base bg-muted/30 border-border/50 focus:border-primary/50"
                  minLength={6}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 sm:h-12 rounded-lg sm:rounded-xl text-xs sm:text-base font-semibold bg-gradient-to-r from-primary to-emerald-400 hover:from-primary/90 hover:to-emerald-400/90 shadow-lg shadow-primary/25 transition-all duration-300"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  </motion.div>
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                  </>
                )}
              </Button>

              {!isLogin && (
                <p className="text-xs text-muted-foreground text-center">
                  Only college email addresses are accepted for campus security.
                </p>
              )}
            </motion.form>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
