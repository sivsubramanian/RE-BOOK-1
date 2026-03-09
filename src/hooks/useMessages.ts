/**
 * useMessages – React hook for buyer-seller chat
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchMessages, sendMessage } from "@/lib/api/messages";
import type { DbMessage } from "@/types";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";
import { API_ORIGIN } from "@/config/api";

export function useMessages(transactionId: string | undefined, currentUserId?: string) {
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const socketRef = useRef<Socket | null>(null);

  const load = useCallback(async () => {
    if (!transactionId) return;
    try {
      const msgs = await fetchMessages(transactionId);
      setMessages(msgs);
    } catch {
      // silent - polling will retry
    }
  }, [transactionId]);

  // Initial load
  useEffect(() => {
    if (!transactionId) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [transactionId, load]);

  // Poll every 5 seconds for new messages
  useEffect(() => {
    if (!transactionId) return;
    pollRef.current = setInterval(load, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [transactionId, load]);

  // Real-time updates via Socket.io; polling remains as a resilient fallback.
  useEffect(() => {
    if (!transactionId) return;

    const socket = io(API_ORIGIN, {
      transports: ["websocket"],
      query: currentUserId ? { userId: currentUserId } : undefined,
    });
    socketRef.current = socket;

    socket.emit("join:transaction", transactionId);
    socket.on("message:new", (msg: DbMessage) => {
      if (msg.transaction_id !== transactionId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.emit("leave:transaction", transactionId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [transactionId, currentUserId]);

  const send = async (content: string) => {
    if (!transactionId || !content.trim()) return false;
    setSending(true);
    const { data, error } = await sendMessage(transactionId, content);
    setSending(false);
    if (error) {
      toast.error(error);
      return false;
    }
    if (data) {
      setMessages(prev => [...prev, data]);
    }
    return true;
  };

  return { messages, loading, sending, send, refetch: load };
}
