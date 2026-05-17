import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ComplianceOverrideForm, ResourceSuggestionActions } from "./ui";

export default async function AdminCompliancePage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/login");
  const [dsrs, consents, dsrCounts, consentCounts, resourceSuggestions] = await Promise.all([
    db.dataSubjectRequest.findMany({ orderBy: { createdAt: "asc" }, take: 50, include: { user: true } }),
    db.parentalConsent.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { student: true } }),
    db.dataSubjectRequest.groupBy({ by: ["requestType", "status"], _count: true }),
    db.parentalConsent.findMany({ select: { verifiedAt: true, revokedAt: true, createdAt: true } }),
    db.resourceSuggestion.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { teacher: { select: { name: true, email: true } } },
    }),
  ]);
  const oldestPending = dsrs.find((request) => request.status === "PENDING");
  const oldestPendingAgeDays = oldestPending ? Math.round((Date.now() - oldestPending.createdAt.getTime()) / 86_400_000) : 0;
  const verifiedConsentCount = consentCounts.filter((consent) => consent.verifiedAt && !consent.revokedAt).length;
  const pendingConsentCount = consentCounts.filter((consent) => !consent.verifiedAt && !consent.revokedAt).length;
  const revokedConsentCount = consentCounts.filter((consent) => consent.revokedAt).length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-3xl font-black text-slate-950">Compliance</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric label="Oldest pending DSR" value={`${oldestPendingAgeDays}d`} />
        <Metric label="Verified consents" value={verifiedConsentCount} />
        <Metric label="Pending consents" value={pendingConsentCount} />
        <Metric label="Revoked consents" value={revokedConsentCount} />
      </div>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow">
        <h2 className="text-xl font-black text-slate-950">Data Subject Requests</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          {dsrCounts.map((count) => <span key={`${count.requestType}-${count.status}`} className="rounded-full bg-slate-100 px-3 py-1">{count.requestType} {count.status}: {count._count}</span>)}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Type</th><th>Status</th><th>User</th><th>Created</th><th>Payload</th></tr></thead>
            <tbody>
              {dsrs.map((request) => (
                <tr key={request.id} className="border-b">
                  <td className="py-2 font-bold">{request.requestType}</td>
                  <td><Badge>{request.status}</Badge></td>
                  <td>{request.user.email}</td>
                  <td>{request.createdAt.toLocaleDateString()}</td>
                  <td>{request.payloadUrl ? <a className="font-bold underline" href={request.payloadUrl}>download</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-slate-950">Resource Suggestions</h2>
          <p className="text-sm text-slate-600">Teacher-suggested resources wait here until an admin approves them into the shared catalog.</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Resource</th><th>Teacher</th><th>Grade / Standard</th><th>Rationale</th><th>Age</th><th>Review</th></tr></thead>
            <tbody>
              {resourceSuggestions.map((suggestion) => (
                <tr key={suggestion.id} className="border-b align-top">
                  <td className="py-3 pr-4">
                    <a className="font-bold text-blue-700 underline" href={suggestion.url} target="_blank" rel="noreferrer">{suggestion.title}</a>
                    <p className="mt-1 text-xs text-slate-500">{suggestion.provider}</p>
                    {suggestion.description ? <p className="mt-1 max-w-md text-xs text-slate-600">{suggestion.description}</p> : null}
                  </td>
                  <td className="py-3 pr-4">{suggestion.teacher.name}<br /><span className="text-xs text-slate-500">{suggestion.teacher.email}</span></td>
                  <td className="py-3 pr-4">Grade {suggestion.gradeLevel || "Any"}<br /><span className="text-xs text-slate-500">{suggestion.standardCode || "Unmapped"} • {suggestion.skill || "No skill"}</span></td>
                  <td className="py-3 pr-4 max-w-sm text-slate-700">{suggestion.rationale || "—"}</td>
                  <td className="py-3 pr-4">{Math.max(0, Math.round((Date.now() - suggestion.createdAt.getTime()) / 86_400_000))}d</td>
                  <td className="py-3 pr-4"><ResourceSuggestionActions id={suggestion.id} /></td>
                </tr>
              ))}
              {!resourceSuggestions.length ? (
                <tr className="border-b"><td className="py-4 text-slate-500" colSpan={6}>No pending resource suggestions.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow">
        <h2 className="text-xl font-black text-slate-950">Parental Consent Records</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Student</th><th>Parent</th><th>Status</th><th>Version</th><th>Created</th></tr></thead>
            <tbody>
              {consents.map((consent) => (
                <tr key={consent.id} className="border-b">
                  <td className="py-2">{consent.student.email}</td>
                  <td>{consent.parentEmail}</td>
                  <td><Badge>{consent.revokedAt ? "REVOKED" : consent.verifiedAt ? "VERIFIED" : "PENDING"}</Badge></td>
                  <td>{consent.consentVersion}</td>
                  <td>{consent.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow">
        <h2 className="text-xl font-black text-slate-950">Pilot Consent Override</h2>
        <ComplianceOverrideForm />
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl bg-white p-4 shadow"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></div>;
}

function Badge({ children }: { children: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{children}</span>;
}
