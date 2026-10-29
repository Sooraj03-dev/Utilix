/* ═══════════════════════════════════════════════════════════════════════════
 * Conflicts Page — Scheduling conflict resolution (placeholder)
 * Owner B · app/(workflow)/conflicts/page.tsx
 *
 * Conflicts require the AI allocation engine and Firebase persistence.
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function ConflictsPage() {
  return (
    <div className="max-w-2xl mx-auto mt-12 text-center">
      <div className="bg-white rounded-xl border border-gray-200 p-10">
        <div className="text-5xl mb-4">⚡</div>
        <h1 className="text-2xl font-bold text-utilix-black mb-2">
          Scheduling Conflicts
        </h1>
        <p className="text-gray-600 mb-4">
          View and resolve competing requests for the same time slot.
        </p>
        <div className="bg-utilix-cream border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          🚧 <strong>Requires AI Service &amp; Firebase</strong> — Conflict
          resolution needs the allocation engine to rank competing requests
          and Firebase for persistence.
        </div>
      </div>
    </div>
  );
}
