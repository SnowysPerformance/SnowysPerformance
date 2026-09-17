"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

// The athlete's own chat with their coaching staff — whichever coach
// replies, it's all one thread. New messages show up within a few
// seconds automatically.
export default function AthleteMessagesPage() {
  const { user } = useAuth();
  const athleteId = user?.id;
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!athleteId) return;
    try {
      setMessages(await api(`/api/messages/${athleteId}`));
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!athleteId) return;
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !athleteId) return;
    setSending(true);
    setError("");
    try {
      await api(`/api/messages/${athleteId}`, { method: "POST", body: JSON.stringify({ body: body.trim() }) });
      setBody("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4">Messages</h1>
      <div className="max-w-2xl flex flex-col" style={{ height: "65vh" }}>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <div className="flex-1 overflow-y-auto bg-surface border border-edge rounded-lg p-3 space-y-2">
          {messages.length === 0 && <p className="text-faint text-sm text-center py-6">No messages yet — say hi to your coaches.</p>}
          {messages.map((m) => {
            const isMe = m.sender.id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-accent text-accenttext" : "bg-raised text-primary"}`}>
                  {!isMe && <div className="text-[10px] opacity-70 mb-0.5">{m.sender.name} (Coach)</div>}
                  <div>{m.body}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">
                    {new Date(m.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 mt-3">
          <input
            className="flex-1 bg-inputbg border border-edge rounded px-3 py-2 text-sm placeholder-faint focus:border-accent outline-none"
            placeholder="Message your coaches…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            disabled={sending || !body.trim()}
            className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40 flex-shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
