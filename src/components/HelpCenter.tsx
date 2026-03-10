import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LifeBuoy, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpCenterProps {
  variant?: "navbar" | "profile";
  className?: string;
}

const ADMIN_NAME = "Sivasubramanian M";
const ADMIN_EMAIL = "sivasufriend@gmail.com";

const HelpCenter = ({ variant = "profile", className }: HelpCenterProps) => {
  const [open, setOpen] = useState(false);

  const triggerClass =
    variant === "navbar"
      ? "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      : "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium glass-card hover:bg-muted/50 text-foreground transition-colors";

  return (
    <>
      <button onClick={() => setOpen(true)} className={cn(triggerClass, className)}>
        <LifeBuoy className="w-4 h-4" />
        <span>Help Centre</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]"
              aria-label="Close help centre"
            />

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 z-[61] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 glass-card border border-border/60 rounded-2xl p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">Help Centre</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    If you face any issue in the website, contact the admin directly.
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/60 p-3 sm:p-4 space-y-1.5">
                <p className="text-xs text-muted-foreground">Admin Name</p>
                <p className="text-sm sm:text-base font-semibold text-foreground">{ADMIN_NAME}</p>
                <p className="text-xs text-muted-foreground pt-2">Admin Email</p>
                <a
                  href={`mailto:${ADMIN_EMAIL}?subject=ReBook%20Help%20Request`}
                  className="inline-flex items-center gap-2 text-sm sm:text-base font-medium text-primary hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  {ADMIN_EMAIL}
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default HelpCenter;
