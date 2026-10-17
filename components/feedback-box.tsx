"use client";

import { useState, useSyncExternalStore } from "react";

const key = "hisab.feedback.v1";
const eventName = "hisab-feedback";
let notes: string[] = [];
let hydrated = false;

function readNotes(): string[] {
  if (!hydrated) {
    hydrated = true;
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as string[];
        notes = Array.isArray(parsed) ? parsed : [];
      } catch {
        window.localStorage.removeItem(key);
      }
    }
  }
  return notes;
}

function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

function write(next: string[]) {
  notes = next;
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event(eventName));
}

export function FeedbackBox() {
  const saved = useSyncExternalStore(subscribe, readNotes, () => [] as string[]);
  const [note, setNote] = useState("");

  return (
    <section className="mt-8 rounded-2xl border border-line p-4">
      <h2 className="text-2xl">A note for yourself</h2>
      <p className="mt-2 text-sm text-muted">This stays in the browser. It is not sent anywhere. Copy it if you want to keep it outside the site.</p>
      <textarea className="mt-3 min-h-24 w-full rounded-xl border border-line p-3" value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full bg-accent px-4 text-accent-ink"
          onClick={() => {
            if (!note.trim()) return;
            write([`${new Date().toISOString().slice(0, 10)}: ${note.trim()}`, ...saved].slice(0, 20));
            setNote("");
          }}
        >
          Keep on this device
        </button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => write([])}>
          Clear notes
        </button>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {saved.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
