/**
 * Navbar – Auth-aware navigation with profile dropdown
 */
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, User, Store, Home, LogOut, BarChart3, ArrowLeftRight, Loader2, Bell, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import HelpCenter from "@/components/HelpCenter";

const navItems = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/seller-studio", icon: Store, label: "Studio" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, displayName, loggingOut } = useAuth();
  const queryClient = useQueryClient();
  const { notifications, unreadCount, readOne, readAll } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const nameToShow = displayName || profile?.full_name || "User";
  const avatarSeed = nameToShow;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    queryClient.clear(); // Wipe all cached data
    toast.success("Logged out successfully");
    navigate("/auth", { replace: true });
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2">
          <img src="/bg removed logo.png" alt="ReBook Logo" className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16" />
          <span className="font-display text-base sm:text-lg lg:text-xl font-bold gradient-text">ReBook</span>
        </Link>

        {/* Nav links + Profile */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}

          <HelpCenter variant="navbar" />

          {/* Notification bell */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }}
                className="relative p-1.5 sm:p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-72 sm:w-80 glass-card rounded-xl border border-border/50 shadow-xl overflow-hidden"
                  >
                    <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => { readAll(); }}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <button
                            key={n.id}
                            onClick={() => { readOne(n.id); if (n.metadata?.book_id) { setNotifOpen(false); navigate(`/book/${n.metadata.book_id}`); } }}
                            className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 ${
                              !n.is_read ? "bg-primary/5" : ""
                            }`}
                          >
                            <p className="text-xs sm:text-sm font-medium text-foreground">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Profile dropdown */}
          <div className="relative ml-1 sm:ml-2" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${
                location.pathname === "/profile"
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50"
              }`}
            >
              {user ? (
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`}
                  alt="avatar"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted ring-1 ring-primary/20"
                />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="hidden lg:inline text-xs font-medium text-foreground truncate max-w-[100px]">
                {user ? nameToShow : "Login"}
              </span>
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-56 glass-card rounded-xl border border-border/50 shadow-xl overflow-hidden"
                >
                  {user ? (
                    <>
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-border/50">
                        <p className="text-sm font-medium text-foreground truncate">{nameToShow}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        {profile && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {profile.department} · Sem {profile.semester}
                          </p>
                        )}
                      </div>
                      {/* Links */}
                      <div className="py-1">
                        <button
                          onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-2"
                        >
                          <User className="w-4 h-4 text-muted-foreground" /> Profile
                        </button>
                        <button
                          onClick={() => { setDropdownOpen(false); navigate("/transactions"); }}
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-2"
                        >
                          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" /> Transactions
                        </button>
                        <button
                          onClick={() => { setDropdownOpen(false); navigate("/analytics"); }}
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-2"
                        >
                          <BarChart3 className="w-4 h-4 text-muted-foreground" /> Analytics
                        </button>
                      </div>
                      {/* Logout */}
                      <div className="border-t border-border/50 py-1">
                        <button
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 disabled:opacity-50"
                        >
                          {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                          {loggingOut ? "Logging out…" : "Log out"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-1">
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/auth"); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-2"
                      >
                        <User className="w-4 h-4" /> Sign In / Sign Up
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
