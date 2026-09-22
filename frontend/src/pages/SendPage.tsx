import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiRequestError } from "../api/client";
import { Button, Card, StatTile, StatusBadge } from "../components/ui";
import { Campaign, SenderAccount } from "../types";

export function SendPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  async function load() {
    const [campaignData, accountsData] = await Promise.all([
      apiFetch<{ campaign: Campaign }>(`/campaigns/${id}`),
      apiFetch<{ accounts: SenderAccount[] }>("/sender-accounts"),
    ]);
    setCampaign(campaignData.campaign);
    setAccounts(accountsData.accounts);
    return campaignData.campaign;
  }

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function startPolling() {
    pollRef.current = window.setInterval(async () => {
      const updated = await load();
      if (updated.status === "completed" && pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    }, 2000);
  }

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      await apiFetch(`/campaigns/${id}/confirm-send`, { method: "POST" });
      await load();
      startPolling();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not send.");
      setConfirming(false);
    }
  }

  if (!campaign) return <p className="text-navy/50">Loading…</p>;

  const account = accounts.find((a) => a.key === campaign.fromAccountKey);
  const selectedCount = campaign.recipients?.filter((r) => r.isSelected && r.status !== "invalid").length ?? 0;
  const processed = campaign.sentCount + campaign.failedCount;
  const isSendingOrDone = campaign.status !== "draft";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl text-navy">Send</h1>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Card className="space-y-3">
        <h2 className="font-medium text-navy">Confirm before sending</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-navy/5 pb-2">
            <dt className="text-navy/50">Sender</dt>
            <dd className="font-medium">{account ? `${account.label} — ${account.email}` : "Not selected"}</dd>
          </div>
          <div className="flex justify-between border-b border-navy/5 pb-2">
            <dt className="text-navy/50">Recipients</dt>
            <dd className="font-medium">{selectedCount}</dd>
          </div>
          <div className="flex justify-between border-b border-navy/5 pb-2">
            <dt className="text-navy/50">Subject</dt>
            <dd className="font-medium">{campaign.subject}</dd>
          </div>
        </dl>
        <div className="rounded border border-navy/10 bg-[#F7F5F1] p-3 text-sm text-navy/70">
          Sending starts immediately once confirmed and cannot be undone. Each recipient's copy is personalised
          individually.
        </div>

        {!isSendingOrDone && (
          <Button onClick={handleConfirm} disabled={confirming || selectedCount === 0}>
            {confirming ? "Starting…" : `Confirm and send to ${selectedCount} recipient${selectedCount === 1 ? "" : "s"}`}
          </Button>
        )}
      </Card>

      {isSendingOrDone && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-navy">
              {campaign.status === "sending" ? "Sending…" : "Delivery results"}
            </h2>
            <StatusBadge status={campaign.status} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total selected" value={selectedCount} />
            <StatTile label="Sent" value={campaign.sentCount} />
            <StatTile label="Failed" value={campaign.failedCount} />
            <StatTile label="Skipped" value={campaign.skippedCount} />
          </div>
          {campaign.status === "sending" && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded bg-navy/10">
              <div
                className="h-full bg-gold transition-all"
                style={{ width: `${selectedCount ? Math.min(100, (processed / selectedCount) * 100) : 0}%` }}
              />
            </div>
          )}
          {campaign.status === "completed" && (
            <div className="mt-4">
              <Button variant="secondary" onClick={() => navigate(`/history/${id}`)}>
                View full delivery log
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
