/**
 * useMessages – React hook for buyer-seller chat
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchMessages, sendMessage } from "@/lib/api/messages";
import type { DbMessage } from "@/types";
import { toast } from "sonner";

export function useMessages(transactionId: string | undefined) {
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

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
