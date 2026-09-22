import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { Button, Card, StatTile, StatusBadge } from "../components/ui";
import { Campaign } from "../types";

export function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ campaigns: Campaign[] }>("/campaigns")
      .then((data) => setCampaigns(data.campaigns))
      .finally(() => setLoading(false));
  }, []);

  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalFailed = campaigns.reduce((sum, c) => sum + c.failedCount, 0);
  const draftCount = campaigns.filter((c) => c.status === "draft").length;
  const recent = campaigns.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-navy">Dashboard</h1>
        <Link to="/clients">
          <Button>Upload a new client list</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Campaigns" value={campaigns.length} />
        <StatTile label="Drafts in progress" value={draftCount} />
        <StatTile label="Emails sent" value={totalSent} />
        <StatTile label="Failed sends" value={totalFailed} />
      </div>

      <Card>
        <h2 className="mb-4 font-medium text-navy">Recent activity</h2>
        {loading ? (
          <p className="text-sm text-navy/50">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-navy/50">No campaigns yet. Upload a client list to get started.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="py-2">File</th>
                <th className="py-2">Status</th>
                <th className="py-2">Recipients</th>
                <th className="py-2">Sent</th>
                <th className="py-2">Uploaded</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id} className="border-b border-navy/5">
                  <td className="py-2">{c.originalFilename}</td>
                  <td className="py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-2">{c.validRecipients}</td>
                  <td className="py-2">{c.sentCount}</td>
                  <td className="py-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 text-right">
                    <Link
                      to={c.status === "draft" ? `/compose/${c.id}` : `/history/${c.id}`}
                      className="text-gold hover:underline"
                    >
                      {c.status === "draft" ? "Continue" : "View"}
                    </Link>
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
