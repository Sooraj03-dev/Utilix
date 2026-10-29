/* ═══════════════════════════════════════════════════════════════════════════
 * Approvals Page — Coordinator approval queue (placeholder)
 * Owner B · app/(workflow)/approvals/page.tsx
 *
 * Approvals require Firebase Auth roles and the allocation engine.
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function ApprovalsPage() {
  return (
    <div className="max-w-2xl mx-auto mt-12 text-center">
      <div className="bg-white rounded-xl border border-gray-200 p-10">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-utilix-black mb-2">
          Approvals Queue
        </h1>
        <p className="text-gray-600 mb-4">
          Coordinators review and approve/reject booking requests here.
        </p>
        <div className="bg-utilix-cream border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          🚧 <strong>Requires Firebase</strong> — This page needs
          authenticated user roles (coordinator vs. student) and the
          allocation engine to rank competing requests.
        </div>
      </div>
    </div>
  );
}
