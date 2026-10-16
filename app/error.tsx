"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="mt-3 text-muted">The calculation did not finish. Your saved goals, if any, are still in this browser.</p>
      <button type="button" className="mt-4 min-h-11 rounded-full bg-accent px-4 text-accent-ink" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
