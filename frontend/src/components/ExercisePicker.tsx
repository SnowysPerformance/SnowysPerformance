"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

// Searchable picker over the team's exercise library. Used when an athlete
// logs a workout that didn't come from their plan: they can only pick an
// exercise their coach has put in the library (no free-typed names), so
// logs stay consistent for PRs, progress charts and the leaderboard.
export default function ExercisePicker({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (name: string) => void;
  className?: string;
}) {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api("/api/library")
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  // Keep the box in sync when the form resets or a value is set elsewhere.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close the list when tapping anywhere outside it.
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
    return list.slice(0, 50);
  }, [items, query]);

  function pick(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className={className + " w-full"}
        placeholder="Search exercise library…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          // Typing un-picks the current exercise until one is chosen again.
          if (value) onChange("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (open && matches.length > 0) pick(matches[0].name);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-surface border border-edge rounded shadow-lg">
          {!loaded && <div className="px-3 py-2 text-sm text-faint">Loading…</div>}
          {loaded && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-faint">Your coach hasn't added any exercises to the library yet.</div>
          )}
          {loaded && items.length > 0 && matches.length === 0 && (
            <div className="px-3 py-2 text-sm text-faint">No match. Ask your coach to add it to the library.</div>
          )}
          {matches.map((i) => (
            <button
              type="button"
              key={i.id}
              onClick={() => pick(i.name)}
              className={
                "block w-full text-left px-3 py-2 text-sm hover:bg-raised " +
                (i.name === value ? "text-accent font-medium" : "text-primary")
              }
            >
              {i.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
