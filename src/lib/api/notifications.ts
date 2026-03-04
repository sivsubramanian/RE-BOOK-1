/**
 * Notifications API Service – REST API backed notifications
 */
import { apiFetch } from "@/lib/api";

export interface DbNotification {
  id: string;
  user_id: string;
  type: "transaction_update" | "favorite" | "system";
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, string>;
  created_at: string;
}

/** Fetch all notifications for the current user */
export async function fetchNotifications(_userId: string): Promise<DbNotification[]> {
  return apiFetch<DbNotification[]>("/notifications");
}

/** Get unread notification count */
export async function getUnreadCount(_userId: string): Promise<number> {
  try {
    const data = await apiFetch<{ count: number }>("/notifications/unread");
    return data.count;
  } catch {
    return 0;
  }
}

/** Mark a single notification as read */
export async function markAsRead(notifId: string): Promise<void> {
  await apiFetch(`/notifications/${notifId}/read`, { method: "PUT" });
}

/** Mark all notifications as read for a user */
export async function markAllAsRead(_userId: string): Promise<void> {
  await apiFetch("/notifications/read-all", { method: "PUT" });
}
