/**
 * Analytics Dashboard – Platform-wide stats with Recharts visualizations
 *
 * Features:
 * - Key metric cards (total books, users, transactions, avg price)
 * - Department distribution bar chart
 * - Monthly listings trend area chart
 * - Real data from Supabase analytics RPC (with client-side fallback)
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Users, ArrowLeftRight, IndianRupee, TrendingUp, Award, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { fetchAnalytics } from "@/lib/api/transactions";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#64748b"];

interface AnalyticsData {
  total_books: number;
  total_users: number;
  avg_price: number;
  total_transactions: number;
  completed_transactions: number;
  most_demanded_dept: string;
  dept_distribution: Array<{ department: string; count: number }>;
  monthly_listings: Array<{ month: string; count: number }>;
}

const Analytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchAnalytics();
        setData(result as AnalyticsData);
      } catch (err) {
        console.error("Analytics fetch error:", err);
        // Set empty fallback
        setData({
          total_books: 0,
          total_users: 0,
          avg_price: 0,
          total_transactions: 0,
          completed_transactions: 0,
          most_demanded_dept: "N/A",
          dept_distribution: [],
          monthly_listings: [],
        });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const metricCards = [
    { label: "Total Books", value: data.total_books, icon: BookOpen, color: "text-primary" },
    { label: "Total Users", value: data.total_users, icon: Users, color: "text-blue-400" },
    { label: "Avg. Price", value: `₹${data.avg_price}`, icon: IndianRupee, color: "text-emerald-400" },
    { label: "Transactions", value: data.total_transactions, icon: ArrowLeftRight, color: "text-secondary" },
    { label: "Completed", value: data.completed_transactions, icon: TrendingUp, color: "text-green-400" },
    { label: "Top Dept", value: data.most_demanded_dept, icon: Award, color: "text-yellow-400", small: true },
  ];

  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">
            Platform-wide insights and trends
          </p>
        </motion.div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          {metricCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl"
            >
              <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.color} mb-2`} />
              <p className={`font-display font-bold text-foreground ${card.small ? 'text-sm' : 'text-lg sm:text-xl'}`}>
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Department Distribution Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4 sm:p-6 rounded-2xl"
          >
            <h3 className="font-display font-semibold text-foreground text-sm sm:text-base mb-4">
              Books by Department
            </h3>
            {data.dept_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.dept_distribution} margin={{ top: 5, right: 5, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    angle={-35}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]}>
                    {data.dept_distribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No department data yet
              </div>
            )}
          </motion.div>

          {/* Department Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-4 sm:p-6 rounded-2xl"
          >
            <h3 className="font-display font-semibold text-foreground text-sm sm:text-base mb-4">
              Department Share
            </h3>
            {data.dept_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.dept_distribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    dataKey="count"
                    nameKey="department"
                    label={({ department, percent }) =>
                      `${department.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "rgba(255,255,255,0.2)" }}
                  >
                    {data.dept_distribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </motion.div>
        </div>

        {/* Monthly Listings Trend */}
        {data.monthly_listings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-4 sm:p-6 rounded-2xl mt-4 sm:mt-6"
          >
            <h3 className="font-display font-semibold text-foreground text-sm sm:text-base mb-4">
              Monthly Listings Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.monthly_listings} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Listings"
                  stroke="#22c55e"
                  fill="url(#colorGreen)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Completion Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-4 sm:p-6 rounded-2xl mt-4 sm:mt-6"
        >
          <h3 className="font-display font-semibold text-foreground text-sm sm:text-base mb-3">
            Transaction Completion Rate
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: data.total_transactions > 0
                      ? `${(data.completed_transactions / data.total_transactions) * 100}%`
                      : "0%",
                  }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                />
              </div>
            </div>
            <span className="font-display font-bold text-foreground text-lg">
              {data.total_transactions > 0
                ? `${Math.round((data.completed_transactions / data.total_transactions) * 100)}%`
                : "0%"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {data.completed_transactions} of {data.total_transactions} transactions completed
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
