import styles from "./RequestListCard.module.css";
import { RequestStatus } from "@prisma/client";

interface Request {
  id: string;
  req_name: string;
  req_type: string;
  req_amo: string;
  status: string;
  createdAt: Date;
  user: {
    name: string;
  };
}

interface RequestListCardProps {
  title: string;
  requests: any[];
  status?: string;
  emptyMessage?: string;
}

export function RequestListCard({ title, requests, status, emptyMessage = "No requests found" }: RequestListCardProps) {
  const formatAmount = (val: string) => {
    if (!val) return "";
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return val;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
  };

  const formatDate = (date: any) => {
    if (!date) return null;
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.count}>{requests.length}</span>
      </div>
      
      <div className={styles.list}>
        {requests.length > 0 ? (
          requests.map((req) => (
            <div key={req.id} className={styles.item}>
              <div className={styles.itemMain}>
                <span className={styles.itemTitle}>{req.req_name}</span>
                <span className={styles.itemUser}>{req.user.name} • {formatAmount(req.req_amo)}</span>
              </div>
              <div className={styles.itemMeta}>
                <span className={styles.itemType}>{req.req_type}</span>
                <span className={styles.itemDate}>
                  {formatDate(req.createdAt)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.empty}>{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
