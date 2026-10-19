"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LostItemActions({ lostId, status }: { lostId: number; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function closeReport() {
    setError("");
    const response = await fetch(`/api/lost-items/${lostId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" })
    });
    const body = await response.json();
    if (!response.ok) return setError(body.error ?? "Unable to close report");
    router.refresh();
  }

  async function deleteReport() {
    if (!window.confirm("Permanently delete this open report? This is allowed only when it has no match records.")) return;
    setError("");
    const response = await fetch(`/api/lost-items/${lostId}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) return setError(body.error ?? "Unable to delete report");
    router.push("/lost-items");
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="actions">
        {status === "OPEN" && <button className="button secondary" onClick={closeReport}>Cancel / close report</button>}
        {status === "OPEN" && <button className="button danger" onClick={deleteReport}>Delete open report</button>}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
