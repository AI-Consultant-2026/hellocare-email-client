import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiRequestError, downloadFile } from "../api/client";
import { Button, Card, StatusBadge } from "../components/ui";
import { Campaign, CampaignAttachment, CampaignRecipient, SenderAccount } from "../types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const VARIABLES = ["{{first_name}}", "{{last_name}}", "{{company}}", "{{email}}"];

export function ComposePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [fromAccountKey, setFromAccountKey] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showRecipients, setShowRecipients] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [campaignData, accountsData] = await Promise.all([
      apiFetch<{ campaign: Campaign }>(`/campaigns/${id}`),
      apiFetch<{ accounts: SenderAccount[] }>("/sender-accounts"),
    ]);
    setCampaign(campaignData.campaign);
    setAccounts(accountsData.accounts);
    setFromAccountKey(campaignData.campaign.fromAccountKey ?? "");
    setSubject(campaignData.campaign.subject ?? "");
    setHtmlBody(campaignData.campaign.htmlBody ?? "");
    setTextBody(campaignData.campaign.textBody ?? "");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/campaigns/${id}`, {
        method: "PATCH",
        body: { fromAccountKey, subject, htmlBody, textBody },
      });
      setNotice("Saved.");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!campaign?.recipients?.length) return;
    const first = campaign.recipients.find((r) => r.status !== "invalid") ?? campaign.recipients[0];
    try {
      await handleSave();
      const data = await apiFetch<{ preview: { html: string; subject: string } }>(
        `/campaigns/${id}/preview/${first.id}`,
      );
      setPreviewHtml(data.preview.html);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not build preview. Fill in all fields first.");
    }
  }

  async function handleSendTest() {
    if (!testEmail) return;
    setError(null);
    setNotice(null);
    try {
      await handleSave();
      await apiFetch(`/campaigns/${id}/test-send`, { method: "POST", body: { testEmail } });
      setNotice(`Test email sent to ${testEmail}.`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not send test email.");
    }
  }

  async function toggleRecipient(recipient: CampaignRecipient) {
    await apiFetch(`/campaigns/${id}/recipients/${recipient.id}`, {
      method: "PATCH",
      body: { isSelected: !recipient.isSelected },
    });
    load();
  }

  async function removeRecipient(recipient: CampaignRecipient) {
    await apiFetch(`/campaigns/${id}/recipients/${recipient.id}`, { method: "DELETE" });
    load();
  }

  async function handleAttachFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (attachInputRef.current) attachInputRef.current.value = "";
    if (!file) return;
    setAttaching(true);
    setError(null);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiFetch(`/campaigns/${id}/attachments`, { method: "POST", body: formData, isFormData: true });
      setNotice(`Attached ${file.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not attach that file.");
    } finally {
      setAttaching(false);
    }
  }

  async function handleRemoveAttachment(attachment: CampaignAttachment) {
    await apiFetch(`/campaigns/${id}/attachments/${attachment.id}`, { method: "DELETE" });
    load();
  }

  async function handleDownloadAttachment(attachment: CampaignAttachment) {
    try {
      await downloadFile(`/campaigns/${id}/attachments/${attachment.id}/download`, attachment.filename);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not download that file.");
    }
  }

  if (!campaign) return <p className="text-navy/50">Loading…</p>;

  if (campaign.status !== "draft") {
    return (
      <Card className="max-w-xl">
        <p className="text-sm text-navy/70">
          This campaign has already been sent or is currently sending, so it can no longer be edited.
        </p>
        <Button onClick={() => navigate(`/history/${id}`)}>View campaign</Button>
      </Card>
    );
  }

  const selectedCount = campaign.recipients?.filter((r) => r.isSelected && r.status !== "invalid").length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-navy">Compose</h1>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

      <Card className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy">From (authorised account)</label>
          <select
            value={fromAccountKey}
            onChange={(e) => setFromAccountKey(e.target.value)}
            className="mt-1 w-full max-w-sm rounded border border-navy/20 px-3 py-2 text-sm"
          >
            <option value="">Select a sender…</option>
            {accounts.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label} — {a.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Dear {{first_name}}, an update from HelloCare Consulting"
            className="mt-1 w-full rounded border border-navy/20 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-navy">HTML body</label>
          <textarea
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={10}
            placeholder="<p>Dear {{first_name}},</p>"
            className="mt-1 w-full rounded border border-navy/20 px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-navy">Plain-text fallback</label>
          <textarea
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            rows={6}
            placeholder="Dear {{first_name}}, ..."
            className="mt-1 w-full rounded border border-navy/20 px-3 py-2 text-sm"
          />
        </div>

        <div className="text-xs text-navy/50">
          Available variables: {VARIABLES.map((v) => (
            <code key={v} className="mr-2 rounded bg-navy/5 px-1">
              {v}
            </code>
          ))}
          A missing field is left blank rather than breaking the email.
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button variant="secondary" onClick={handlePreview}>
            Preview with a real recipient
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-navy">Attachments</h2>
          <div>
            <input ref={attachInputRef} type="file" onChange={handleAttachFile} className="hidden" />
            <Button variant="secondary" onClick={() => attachInputRef.current?.click()} disabled={attaching}>
              {attaching ? "Attaching…" : "Attach a file"}
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-navy/50">
          Sent with every copy of this email. 10MB per file, 20MB total. Executable file types aren't accepted.
        </p>
        {campaign.attachments && campaign.attachments.length > 0 && (
          <ul className="mt-4 space-y-2">
            {campaign.attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded border border-navy/10 px-3 py-2 text-sm">
                <span>
                  {a.filename} <span className="text-navy/40">({formatBytes(a.sizeBytes)})</span>
                </span>
                <span className="flex gap-3">
                  <button className="text-gold hover:underline" onClick={() => handleDownloadAttachment(a)}>
                    Download
                  </button>
                  <button className="text-red-600 hover:underline" onClick={() => handleRemoveAttachment(a)}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {previewHtml && (
        <Card>
          <h2 className="mb-3 font-medium text-navy">Preview</h2>
          <div className="rounded border border-navy/10 bg-white p-4" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-medium text-navy">Send a test email</h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-64 rounded border border-navy/20 px-3 py-2 text-sm"
          />
          <Button variant="secondary" onClick={handleSendTest}>
            Send test
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-navy">
            Recipients ({selectedCount} of {campaign.totalRecipients} selected to send)
          </h2>
          <button className="text-sm text-gold hover:underline" onClick={() => setShowRecipients((s) => !s)}>
            {showRecipients ? "Hide" : "Review"} list
          </button>
        </div>
        {showRecipients && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="py-2">Email</th>
                <th className="py-2">Name</th>
                <th className="py-2">Company</th>
                <th className="py-2">Status</th>
                <th className="py-2">Send?</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {campaign.recipients?.map((r) => (
                <tr key={r.id} className="border-b border-navy/5">
                  <td className="py-2">{r.email || <span className="text-red-500">(missing)</span>}</td>
                  <td className="py-2">
                    {r.firstName} {r.lastName}
                  </td>
                  <td className="py-2">{r.company}</td>
                  <td className="py-2">
                    <StatusBadge status={r.status} />
                    {r.validationErrors.length > 0 && (
                      <span className="ml-2 text-xs text-red-600">{r.validationErrors.join(" ")}</span>
                    )}
                  </td>
                  <td className="py-2">
                    {r.status !== "invalid" && (
                      <input type="checkbox" checked={r.isSelected} onChange={() => toggleRecipient(r)} />
                    )}
                  </td>
                  <td className="py-2">
                    <button className="text-xs text-red-600 hover:underline" onClick={() => removeRecipient(r)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div>
        <Button
          onClick={async () => {
            await handleSave();
            navigate(`/send/${id}`);
          }}
        >
          Continue to Send
        </Button>
      </div>
    </div>
  );
}
