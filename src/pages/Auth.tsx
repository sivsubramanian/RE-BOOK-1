import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Book, Mail, Lock, User, ArrowRight, Sparkles, Eye, EyeOff, GraduationCap, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/** Departments for signup form */
const DEPARTMENTS = [
  "Computer Science", "Electrical Eng.", "Mechanical Eng.",
  "Business Admin", "Mathematics", "Physics", "Chemistry", "Literature"
];

/** No artificial delay for login retries */
const AUTH_COOLDOWN_MS = 0;

/** Password strength checker */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-blue-500" };
  return { score, label: "Strong", color: "bg-green-500" };
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Computer Science");
  const [semester, setSemester] = useState(1);
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastAuthAttempt = useRef<number>(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, session, isCollegeEmail } = useAuth();

  // Warm backend so first login isn't delayed by cold starts.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    }).catch(() => {
      // Ignore warm-up failures; login request will handle real errors.
    });

    return () => controller.abort();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      const from = (location.state as Record<string, { pathname?: string }> | null)?.from?.pathname || "/home";
      navigate(from, { replace: true });
    }
  }, [session, navigate, location]);

  const pwStrength = getPasswordStrength(password);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate-limit: prevent rapid-fire attempts
    const now = Date.now();
    if (now - lastAuthAttempt.current < AUTH_COOLDOWN_MS) {
      toast.error("Please wait a moment before trying again");
      return;
    }
    lastAuthAttempt.current = now;

    // Basic input sanitization
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(cleanEmail, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success("Welcome back to ReBook!");
          // Session update triggers redirect via useEffect to avoid double navigation.
        }
      } else {
        // Validate college email
        if (!isCollegeEmail(cleanEmail)) {
          toast.error("Please use your college email (.edu, .ac.in, .edu.in)");
          setLoading(false);
          return;
        }

        const { error } = await signUp(cleanEmail, password, {
          full_name: fullName,
          department,
          semester,
          role,
        });
        if (error) {
          toast.error(error);
        } else {
          toast.success("Check your college email to verify your account!");
        }
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
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
            <Book className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
            <span className="font-display text-2xl sm:text-3xl font-bold gradient-text">ReBook</span>
          </motion.div>
          <p className="text-muted-foreground text-xs sm:text-sm">Smart Campus Book Exchange Platform</p>
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
                <>
                  {/* Full Name */}
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

                  {/* Department */}
                  <div className="relative">
                    <Building2 className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-9 sm:pl-11 h-10 sm:h-12 rounded-lg sm:rounded-xl text-xs sm:text-base bg-muted/30 border border-border/50 focus:border-primary/50 text-foreground outline-none appearance-none"
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* Semester + Role */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      <select
                        value={semester}
                        onChange={(e) => setSemester(Number(e.target.value))}
                        className="w-full pl-9 sm:pl-11 h-10 sm:h-12 rounded-lg sm:rounded-xl text-xs sm:text-base bg-muted/30 border border-border/50 focus:border-primary/50 text-foreground outline-none appearance-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <option key={s} value={s}>Sem {s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex bg-muted/30 rounded-lg sm:rounded-xl p-1 border border-border/50">
                      {(["buyer", "seller"] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`flex-1 py-2 rounded-md text-xs font-medium capitalize transition-all ${
                            role === r
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
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

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 sm:pl-11 pr-10 h-10 sm:h-12 rounded-lg sm:rounded-xl text-xs sm:text-base bg-muted/30 border-border/50 focus:border-primary/50"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {!isLogin && password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= pwStrength.score ? pwStrength.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password strength: <span className="font-medium text-foreground">{pwStrength.label}</span>
                  </p>
                </div>
              )}

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
                  Only college email addresses (.edu, .ac.in, .edu.in) are accepted for campus security.
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
