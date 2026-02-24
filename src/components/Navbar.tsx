import { Link, useLocation } from "react-router-dom";
import { Search, User, Store, Home } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/seller-studio", icon: Store, label: "Studio" },
  { to: "/profile", icon: User, label: "Profile" },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-2">
          <img src="/bg removed logo.png" alt="ReBook Logo" className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16" />
          <span className="font-display text-base sm:text-lg lg:text-xl font-bold gradient-text">ReBook</span>
        </Link>

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
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
