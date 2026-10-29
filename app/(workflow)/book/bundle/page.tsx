/* ═══════════════════════════════════════════════════════════════════════════
 * Book Bundle Page — Multi-resource booking (placeholder)
 * Owner B · app/(workflow)/book/bundle/page.tsx
 *
 * Bundle booking requires the AI service's /bundle endpoint.
 * This page shows a clear "coming soon" state.
 * ═══════════════════════════════════════════════════════════════════════════ */
import Link from "next/link";

export default function BookBundlePage() {
  return (
    <div className="max-w-2xl mx-auto mt-12 text-center">
      <div className="bg-white rounded-xl border border-gray-200 p-10">
        <div className="text-5xl mb-4">📦</div>
        <h1 className="text-2xl font-bold text-utilix-black mb-2">
          Bundle Booking
        </h1>
        <p className="text-gray-600 mb-4">
          Book multiple resources for the same time slot — e.g., a studio
          <em> and</em> equipment for a team project.
        </p>
        <div className="bg-utilix-cream border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          🚧 <strong>Coming soon</strong> — This feature depends on the AI
          service&apos;s <code>/bundle</code> endpoint, which is under
          development by the AI/ML teammate.
        </div>
        <Link
          href="/resources"
          className="inline-block mt-6 bg-utilix-yellow text-utilix-black font-medium px-6 py-2.5
                     rounded-lg hover:bg-yellow-400 transition-colors text-sm"
        >
          Browse Resources
        </Link>
      </div>
    </div>
  );
}
