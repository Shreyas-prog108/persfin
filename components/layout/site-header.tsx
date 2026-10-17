import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/calculators", label: "Calculators" },
  { href: "/compare", label: "Compare" },
  { href: "/plan", label: "Plan" },
  { href: "/learn", label: "Learn" },
  { href: "/explore", label: "Explore" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-serif text-2xl text-ink no-underline">
          Hisab
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-ink no-underline hover:text-accent">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-full border border-line px-3 py-2 text-sm">
              Menu
            </summary>
            <nav className="absolute right-0 mt-2 w-48 rounded-2xl border border-line bg-surface p-2 shadow-sm" aria-label="Mobile">
              <Link href="/" className="block rounded-xl px-3 py-2 no-underline hover:bg-surface-2">
                Home
              </Link>
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-xl px-3 py-2 no-underline hover:bg-surface-2">
                  {link.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
