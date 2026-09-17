"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

// A shared chat thread with this one athlete — every coach on the team
// sees and can reply to the same conversation (it's "the coaching staff"
// talking to the athlete, not a separate thread per coach). New messages
// show up within a few seconds automatically — this just quietly checks
// for new ones every few seconds rather than needing a live connection.
export default function AthleteMessagesTab({ params }: { params: { id: string } }) {
  const athleteId = params.id;
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      setMessages(await api(`/api/messages/${athleteId}`));
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
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
    if (!body.trim()) return;
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
    <div className="max-w-2xl flex flex-col" style={{ height: "60vh" }}>
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
      <div className="flex-1 overflow-y-auto bg-surface border border-edge rounded-lg p-3 space-y-2">
        {messages.length === 0 && <p className="text-faint text-sm text-center py-6">No messages yet — say hi.</p>}
        {messages.map((m) => {
          const isMe = m.sender.id === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-accent text-accenttext" : "bg-raised text-primary"}`}>
                {!isMe && (
                  <div className="text-[10px] opacity-70 mb-0.5">
                    {m.sender.name} {m.sender.role === "COACH" ? "(Coach)" : ""}
                  </div>
                )}
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
          placeholder="Message this athlete…"
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
  );
}
