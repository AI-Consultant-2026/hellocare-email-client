import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { Card, StatTile, StatusBadge } from "../components/ui";
import { Campaign } from "../types";

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    apiFetch<{ campaign: Campaign }>(`/campaigns/${id}`).then((data) => setCampaign(data.campaign));
  }, [id]);

  if (!campaign) return <p className="text-navy/50">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-navy">{campaign.originalFilename}</h1>
        <StatusBadge status={campaign.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Total" value={campaign.totalRecipients} />
        <StatTile label="Sent" value={campaign.sentCount} />
        <StatTile label="Failed" value={campaign.failedCount} />
        <StatTile label="Skipped" value={campaign.skippedCount} />
        <StatTile label="Invalid/Dup." value={campaign.invalidRecipients + campaign.duplicateRecipients} />
      </div>

      <Card className="text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-navy/50">Sender account</dt>
            <dd className="font-medium">{campaign.fromAccountKey}</dd>
          </div>
          <div>
            <dt className="text-navy/50">Sent by</dt>
            <dd className="font-medium">{campaign.creator?.name}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-navy/50">Subject</dt>
            <dd className="font-medium">{campaign.subject}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium text-navy">Delivery log</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy/10 text-left text-navy/50">
              <th className="py-2">Email</th>
              <th className="py-2">Status</th>
              <th className="py-2">Sent at</th>
              <th className="py-2">Failure reason</th>
            </tr>
          </thead>
          <tbody>
            {campaign.recipients?.map((r) => (
              <tr key={r.id} className="border-b border-navy/5">
                <td className="py-2">{r.email}</td>
                <td className="py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="py-2">{r.sentAt ? new Date(r.sentAt).toLocaleString() : "—"}</td>
                <td className="py-2 text-red-600">{r.errorMessage ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
