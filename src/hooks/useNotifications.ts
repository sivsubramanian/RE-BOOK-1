/**
 * useNotifications – React hook for real-time notifications
 * 
 * Auto-refreshes on transaction actions and periodically polls for new notifications.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type DbNotification,
} from "@/lib/api/notifications";

const POLL_INTERVAL = 30_000; // 30 seconds

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      const [notifs, count] = await Promise.all([
        fetchNotifications(user.id),
        getUnreadCount(user.id),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch {
      // Silently fail – notifications are non-critical
    }
    setLoading(false);
  }, [user?.id]);

  // Initial load + periodic polling
  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  /** Mark one notification as read */
  const readOne = async (notifId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    await markAsRead(notifId);
  };

  /** Mark all as read */
  const readAll = async () => {
    if (!user?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await markAllAsRead(user.id);
  };

  return {
    notifications,
    unreadCount,
    loading,
    refetch: load,
    readOne,
    readAll,
  };
}
