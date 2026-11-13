import type { RowDataPacket } from "mysql2";
import { requireSession } from "@/lib/auth";
import { mysqlPool } from "@/lib/mysql";
import { formatDate } from "@/lib/dates";
import { MarkAllReadButton, NotificationActions } from "@/components/NotificationActions";

export default async function NotificationsPage() {
  const session = await requireSession();
  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    `SELECT notification_id, title, message, type, is_read, created_at
       FROM NOTIFICATION
      WHERE user_id = ?
      ORDER BY created_at DESC, notification_id DESC`,
    [session.userId]
  );

  return (
    <main className="container stack">
      <div className="actions" style={{ justifyContent: "space-between" }}><h1 className="page-title">Notifications</h1><MarkAllReadButton /></div>
      {rows.length === 0 ? <div className="card muted">No notifications yet.</div> : rows.map((n) => (
        <article className="card stack" key={n.notification_id}>
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <div><span className="badge">{n.type}</span> <strong>{n.title}</strong></div>
            <NotificationActions notificationId={Number(n.notification_id)} isRead={Boolean(n.is_read)} />
          </div>
          <div>{n.message}</div>
          <div className="small muted">{formatDate(n.created_at)} IST</div>
        </article>
      ))}
    </main>
  );
}

