import "../globals.css";
import Link from "next/link";

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-utilix-cream">
      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <header className="bg-utilix-black text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="text-utilix-yellow">●</span>
              <span>Utilix</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/resources"
                className="hover:text-utilix-yellow transition-colors"
              >
                Resources
              </Link>
              <Link
                href="/requests"
                className="hover:text-utilix-yellow transition-colors"
              >
                My Requests
              </Link>
              <span className="text-gray-400 text-xs px-2 py-1 rounded bg-gray-800">
                Demo User
              </span>
            </nav>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-gray-500">
          Utilix — Fair campus resource sharing ·{" "}
          <span className="text-utilix-yellow font-medium">⚠ Mock mode</span>{" "}
          — data is not persisted
        </div>
      </footer>
    </div>
  );
}
