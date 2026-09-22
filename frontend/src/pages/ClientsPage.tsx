import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiRequestError } from "../api/client";
import { Button, Card, StatTile } from "../components/ui";
import { UploadSummary } from "../types";

export function ClientsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiFetch<UploadSummary>("/campaigns", { method: "POST", body: formData, isFormData: true });
      setSummary(result);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-navy">Clients</h1>
      <p className="text-sm text-navy/60">
        Upload a CSV of clients to email. Required column: <code className="rounded bg-navy/5 px-1">email</code>. Optional:{" "}
        <code className="rounded bg-navy/5 px-1">first_name</code>, <code className="rounded bg-navy/5 px-1">last_name</code>,{" "}
        <code className="rounded bg-navy/5 px-1">company</code>. Any other columns are kept for personalisation too.
      </p>

      <Card className="max-w-xl">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setSummary(null);
            setError(null);
          }}
          className="block w-full text-sm"
        />
        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4">
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload and validate"}
          </Button>
        </div>
      </Card>

      {summary && (
        <Card className="max-w-xl">
          <h2 className="mb-4 font-medium text-navy">Validation report</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total records" value={summary.totalRecords} />
            <StatTile label="Valid" value={summary.validRecipients} />
            <StatTile label="Invalid" value={summary.invalidRecipients} />
            <StatTile label="Duplicate" value={summary.duplicateRecipients} />
          </div>
          <p className="mt-4 text-sm text-navy/70">
            <strong>{summary.willReceive}</strong> recipient{summary.willReceive === 1 ? "" : "s"} will actually receive
            this message by default. Invalid records are always excluded; duplicates start deselected but can be
            reviewed and opted in individually on the next step.
          </p>
          <div className="mt-4">
            <Button onClick={() => navigate(`/compose/${summary.campaignId}`)}>Continue to Compose</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
