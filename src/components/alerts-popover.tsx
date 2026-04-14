"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

type Alert = { id: string; title: string; body: string; read: boolean; createdAt: string };

export function AlertsPopover() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => {});
  }, [open]);

  const unread = alerts.filter((a) => !a.read).length;

  async function markRead(id: string) {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, read: true } : x)));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative inline-flex rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        aria-label="Alerts"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {alerts.length === 0 ? (
            <p className="p-3 text-sm text-zinc-500">No alerts yet.</p>
          ) : (
            <ul className="space-y-1">
              {alerts.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => markRead(a.id)}
                    className="w-full rounded-lg p-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <p className="font-medium text-zinc-900 dark:text-white">{a.title}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{a.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
