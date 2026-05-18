import styles from "./StatsCards.module.css";

interface Stat {
  label: string;
  value: string | number;
  color: "primary" | "success" | "warning" | "error" | "accent";
}

export function StatsCards({ stats }: { stats: Stat[] }) {
  return (
    <div className={styles.grid}>
      {stats.map((stat) => (
        <div key={stat.label} className={`${styles.card} ${styles[stat.color]}`}>
          <div className={styles.iconWrap}>
            <div className={styles.iconDot} />
          </div>
          <div className={styles.info}>
            <span className={styles.value}>{stat.value}</span>
            <span className={styles.label}>{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
