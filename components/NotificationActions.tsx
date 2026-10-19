"use client";

import { useRouter } from "next/navigation";

export function NotificationActions({
  notificationId,
  isRead,
}: {
  notificationId: number;
  isRead: boolean;
}) {
  const router = useRouter();
  if (isRead) return <span className="badge">Read</span>;

  async function markRead() {
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
    router.refresh();
  }

  return (
    <button className="button secondary" onClick={markRead}>
      Mark read
    </button>
  );
}

export function MarkAllReadButton() {
  const router = useRouter();
  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    router.refresh();
  }
  return (
    <button className="button secondary" onClick={markAll}>
      Mark all read
    </button>
  );
}
