import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { Card } from "../components/ui";
import { SenderAccount } from "../types";

export function SettingsPage() {
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);

  useEffect(() => {
    apiFetch<{ accounts: SenderAccount[] }>("/sender-accounts").then((data) => setAccounts(data.accounts));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-navy">Settings</h1>
      <Card className="max-w-xl">
        <h2 className="mb-2 font-medium text-navy">Authorised sending accounts</h2>
        <p className="mb-4 text-sm text-navy/60">
          These are the only accounts this tool can send from. Adding, removing, or changing one requires a
          configuration change on the server (its SMTP credential as an environment variable) and a deploy — not
          something changeable from this screen, by design, so a compromised login here can never widen who mail
          can be sent as.
        </p>
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.key} className="flex items-center justify-between rounded border border-navy/10 px-3 py-2 text-sm">
              <span className="font-medium">{a.label}</span>
              <span className="text-navy/60">{a.email}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
