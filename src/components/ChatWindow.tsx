/**
 * ChatWindow – In-app messaging for buyer-seller communication
 *
 * Opens as a collapsible panel within a transaction card.
 * Polls every 5 seconds for new messages via the useMessages hook.
 */
import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";

interface ChatWindowProps {
  transactionId: string;
  currentUserId: string;
}

const ChatWindow = ({ transactionId, currentUserId }: ChatWindowProps) => {
  const { messages, loading, sending, send } = useMessages(transactionId, currentUserId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const ok = await send(text.trim());
    if (ok) setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Messages area */}
      <div className="h-52 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            No messages yet. Start the conversation!
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {!isMe && (
                  <p className="font-medium text-[10px] mb-0.5 opacity-70">
                    {msg.sender?.full_name || "User"}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border/50 p-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded-lg bg-muted/50 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
