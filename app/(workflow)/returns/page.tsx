/* ═══════════════════════════════════════════════════════════════════════════
 * Returns Page — Equipment check-in / return (placeholder)
 * Owner B · app/(workflow)/returns/page.tsx
 *
 * Returns require Firebase state tracking for checked-out items.
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function ReturnsPage() {
  return (
    <div className="max-w-2xl mx-auto mt-12 text-center">
      <div className="bg-white rounded-xl border border-gray-200 p-10">
        <div className="text-5xl mb-4">🔄</div>
        <h1 className="text-2xl font-bold text-utilix-black mb-2">
          Returns &amp; Check-in
        </h1>
        <p className="text-gray-600 mb-4">
          Return equipment and check in after using a space.
        </p>
        <div className="bg-utilix-cream border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          🚧 <strong>Requires Firebase</strong> — This page needs real-time
          tracking of checked-out items and authenticated user sessions.
        </div>
      </div>
    </div>
  );
}
