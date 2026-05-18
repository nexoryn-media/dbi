import styles from "./RecentActivity.module.css";

interface Request {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  createdAt: Date;
  user: { name: string; email: string };
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function RecentActivity({
  requests,
  isAdmin,
}: {
  requests: Request[];
  isAdmin: boolean;
}) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Recent Activity</h2>

      {requests.length === 0 ? (
        <div className={styles.empty}>
          <p>No recent activity</p>
        </div>
      ) : (
        <div className={styles.list}>
          {requests.map((req) => (
            <div key={req.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.itemTitle}>{req.title}</span>
                <span className={styles.itemTime}>
                  {timeAgo(req.createdAt)}
                </span>
              </div>
              <div className={styles.itemMeta}>
                {isAdmin && (
                  <span className={styles.itemUser}>{req.user.name}</span>
                )}
                <span className={styles.tag}>{req.type}</span>
                <span
                  className={`${styles.status} ${styles[`status${req.status.replace("_", "")}`]}`}
                >
                  {STATUS_LABELS[req.status] || req.status}
                </span>
                <span
                  className={`${styles.priority} ${styles[`priority${req.priority}`]}`}
                >
                  {PRIORITY_LABELS[req.priority] || req.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
