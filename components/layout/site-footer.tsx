import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted md:grid-cols-3">
        <div>
          <p className="font-serif text-xl text-ink">Hisab</p>
          <p className="mt-2 max-w-sm">
            Educational calculators for Indian personal finance. Results follow the assumptions you enter. They are not a bank quote, a tax filing, or a product recommendation.
          </p>
        </div>
        <div>
          <p className="font-medium text-ink">Look up</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/calculators">All calculators</Link></li>
            <li><Link href="/learn">Guides</Link></li>
            <li><Link href="/sources">Sources</Link></li>
            <li><Link href="/methodology">Methodology</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-ink">On this device</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/plan">Goal plan</Link></li>
            <li><Link href="/privacy">Privacy and stored data</Link></li>
            <li><Link href="/search">Search tools</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
