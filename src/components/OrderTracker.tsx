/**
 * OrderTracker – Visual step tracker for transaction lifecycle
 *
 * Steps: Requested → Accepted → Shipped → Delivered (Completed)
 * Shows current position with colour-coded dots and connecting lines.
 */
import { Check } from "lucide-react";

interface OrderTrackerProps {
  status: string;
  orderStatus: string | null;
}

const steps = [
  { key: "requested", label: "Requested" },
  { key: "accepted", label: "Accepted" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

function getActiveStep(status: string, orderStatus: string | null): number {
  if (status === "completed" || orderStatus === "delivered" || orderStatus === "completed") return 4;
  if (orderStatus === "shipped") return 3;
  if (status === "accepted") return 2;
  if (status === "requested") return 1;
  return 0;
}

const OrderTracker = ({ status, orderStatus }: OrderTrackerProps) => {
  // Don't show tracker for rejected/cancelled
  if (status === "rejected" || status === "cancelled") return null;

  const active = getActiveStep(status, orderStatus);

  return (
    <div className="flex items-center w-full my-3">
      {steps.map((step, i) => {
        const done = i < active;
        const current = i === active - 1;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Dot */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : current
                    ? "ring-2 ring-primary bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${
                  done || current ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connecting line */}
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1.5 rounded-full transition-all ${
                  i < active - 1 ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderTracker;
