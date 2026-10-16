import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-4xl">That page is not here</h1>
      <p className="mt-3 text-muted">The calculator or guide may have moved. Search from the home page, or open the full list.</p>
      <p className="mt-4 flex gap-4">
        <Link href="/">Home</Link>
        <Link href="/calculators">Calculators</Link>
      </p>
    </div>
  );
}
