import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-navy/10 bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base = "rounded px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    primary: "bg-navy text-white hover:bg-navy/90",
    secondary: "border border-navy/20 text-navy hover:bg-navy/5",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sending: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  pending: "bg-gray-100 text-gray-700",
  queued: "bg-blue-100 text-blue-800",
  sent: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-gray-100 text-gray-500",
  invalid: "bg-red-100 text-red-700",
  duplicate: "bg-amber-100 text-amber-800",
  unsubscribed: "bg-gray-200 text-gray-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-navy/10 bg-white px-4 py-3">
      <div className="text-2xl font-semibold text-navy">{value}</div>
      <div className="text-xs uppercase tracking-wide text-navy/50">{label}</div>
    </div>
  );
}
