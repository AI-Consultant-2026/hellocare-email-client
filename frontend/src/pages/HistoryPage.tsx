import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { Card, StatusBadge } from "../components/ui";
import { Campaign } from "../types";

export function HistoryPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    apiFetch<{ campaigns: Campaign[] }>("/campaigns")
      .then((data) => setCampaigns(data.campaigns))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(c: Campaign) {
    const label = c.subject || c.originalFilename;
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    await apiFetch(`/campaigns/${c.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-navy">History</h1>
      <Card>
        {loading ? (
          <p className="text-sm text-navy/50">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-navy/50">No campaigns yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="py-2">File</th>
                <th className="py-2">Sender</th>
                <th className="py-2">Subject</th>
                <th className="py-2">Status</th>
                <th className="py-2">Sent / Failed</th>
                <th className="py-2">Created by</th>
                <th className="py-2">Date</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-navy/5">
                  <td className="py-2">{c.originalFilename}</td>
                  <td className="py-2">{c.fromAccountKey ?? "—"}</td>
                  <td className="max-w-[180px] truncate py-2">{c.subject ?? "—"}</td>
                  <td className="py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-2">
                    {c.sentCount} / {c.failedCount}
                  </td>
                  <td className="py-2">{c.creator?.name ?? "—"}</td>
                  <td className="py-2">{new Date(c.createdAt).toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <Link
                      to={c.status === "draft" ? `/compose/${c.id}` : `/history/${c.id}`}
                      className="text-gold hover:underline"
                    >
                      {c.status === "draft" ? "Continue" : "View"}
                    </Link>
                    <button className="ml-3 text-red-600 hover:underline" onClick={() => handleDelete(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
