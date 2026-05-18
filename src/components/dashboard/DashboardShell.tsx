"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./DashboardShell.module.css";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  hasFtdAccount?: boolean;
}

interface DashboardShellProps {
  user: User;
  brandName: string;
  logoUrl: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    roles: ["USER", "ADMIN"],
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 17.5C3 14.5 6 12.5 10 12.5C14 12.5 17 14.5 17 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    roles: ["ADMIN"],
  },

  {
    label: "Requests",
    href: "/dashboard/requests?status=SUBMITTED",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 4H16V14C16 14.5523 15.5523 15 15 15H5C4.44772 15 4 14.5523 4 14V4Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 4L10 10L16 4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    roles: ["USER", "ADMIN"],
  },
  {
    label: "Pending",
    href: "/dashboard/requests?status=PENDING",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    roles: ["USER", "ADMIN"],
  },
  {
    label: "Confirmed",
    href: "/dashboard/requests?status=CONFIRMED",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    roles: ["USER", "ADMIN"],
  },
  {
    label: "Completed",
    href: "/dashboard/requests?status=COMPLETED",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    roles: ["USER", "ADMIN"],
  },
  {
    label: "FTD",
    href: "/dashboard/ftd",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    roles: ["USER", "ADMIN"],
    requiresFtd: true,
  },
  {
    label: "Accounts",
    href: "/dashboard/accounts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="3" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    roles: ["ADMIN"],
  },
  {
    label: "Brands",
    href: "/dashboard/brands",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    roles: ["ADMIN"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2V4M10 16V18M18 10H16M4 10H2M15.66 4.34L14.24 5.76M5.76 14.24L4.34 15.66M15.66 15.66L14.24 14.24M5.76 5.76L4.34 4.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    roles: ["ADMIN"],
  },
];

export function DashboardShell({
  user,
  brandName,
  logoUrl,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifs, setNotifs] = useState<{
    counts: Record<string, number>;
    actionRequiredStatus: string;
    broadcasts: any[];
    recentUpdates: any[];
  }>({ counts: {}, actionRequiredStatus: "", broadcasts: [], recentUpdates: [] });
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<string[]>([]);
  const [lastViewedNotifs, setLastViewedNotifs] = useState<number>(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const lastUpdateId = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio Object early
  useEffect(() => {
    if (!audioRef.current && typeof window !== "undefined") {
      audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
      audioRef.current.volume = 0.5;
      audioRef.current.load(); // Preload
    }
  }, []);

  const playNotifSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Sound play blocked:", e));
    }
  };

  // Notification Sound Effect - Trigger on NEW latest ID
  useEffect(() => {
    const latestId = notifs.recentUpdates[0]?.id;
    
    // Only play if latest ID changed AND it's not the first load
    if (latestId && lastUpdateId.current && latestId !== lastUpdateId.current) {
      playNotifSound();
    }
    
    if (latestId) {
      lastUpdateId.current = latestId;
    }
  }, [notifs.recentUpdates]);

  // Initialize lastViewedNotifs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("lastViewedNotifs");
    if (saved) setLastViewedNotifs(parseInt(saved));
  }, []);

  // Click outside to close notification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setNotifs(data);
        }
      } catch (e) {
        console.error("Failed to fetch notifs", e);
      }
    };
    fetchNotifs();
    const int = setInterval(fetchNotifs, 5000);
    return () => clearInterval(int);
  }, []);

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(user.role)) return false;
    if ((item as any).requiresFtd && !user.hasFtdAccount) return false;
    return true;
  });

  const isItemActive = (href: string) => {
    const [path, query] = href.split("?");
    
    // Check if base path matches
    const pathMatch = pathname === path;
    
    // If there's a query (status filter), ensure it matches too
    if (query) {
      const itemParams = new URLSearchParams(query);
      const statusParam = itemParams.get("status");
      return pathMatch && searchParams.get("status") === statusParam;
    }
    
    // For non-query items, use exact match or sub-path match (except for dashboard root)
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathMatch || pathname.startsWith(path + "/");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className={styles.brandLogo}
              />
            ) : (
              <div className={styles.brandMark}>
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="var(--dash-primary)" />
                  <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <span className={styles.brandName}>{brandName}</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {filteredNav.map((item) => {
            const statusMatch = item.href.match(/status=([A-Z]+)/);
            const status = statusMatch ? statusMatch[1] : null;
            const count = status ? notifs.counts[status] || 0 : 0;
            const needsAction = status === notifs.actionRequiredStatus;

            return (
              <a
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isItemActive(item.href) ? styles.navItemActive : ""} ${needsAction ? styles.navItemGlow : ""}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {count > 0 && (
                  <span className={styles.navBadge}>{count}</span>
                )}
              </a>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user.name}</span>
            </div>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Sign out"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6.5 16H4C3.44772 16 3 15.5523 3 15V3C3 2.44772 3.44772 2 4 2H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 12.5L15.5 9L12 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="7" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <line x1="3" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className={styles.topbarRight}>
            
            {/* Notification Bell */}
            <div className={styles.notifContainer} style={{ position: "relative" }} ref={notifRef}>
              <button 
                className={styles.bellBtn} 
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  if (!showNotifDropdown) {
                    const now = Date.now();
                    setLastViewedNotifs(now);
                    localStorage.setItem("lastViewedNotifs", String(now));
                  }
                }}
                style={{ background: "none", border: "none", color: "var(--dash-text)", cursor: "pointer", position: "relative", padding: "0.5rem" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {(notifs.actionRequiredStatus || notifs.recentUpdates.some(u => new Date(u.timestamp).getTime() > lastViewedNotifs)) && (
                  <span style={{ position: "absolute", top: "5px", right: "5px", width: "10px", height: "10px", background: "var(--dash-accent)", borderRadius: "50%", boxShadow: "0 0 8px var(--dash-accent)" }}></span>
                )}
              </button>

              {showNotifDropdown && (
                <div style={{ position: "absolute", top: "100%", right: 0, width: "300px", background: "var(--dash-surface)", border: "1px solid var(--dash-border)", borderRadius: "8px", padding: "1rem", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", zIndex: 100 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: "var(--dash-text)" }}>Notifications</h4>
                  </div>
                  {notifs.actionRequiredStatus && (
                    <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.05)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.75rem", borderLeft: "3px solid var(--dash-accent)" }}>
                      You have <strong>{notifs.actionRequiredStatus}</strong> requests that require your attention.
                    </div>
                  )}

                  {notifs.recentUpdates && notifs.recentUpdates.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <h5 style={{ margin: "0.5rem 0", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--dash-text-secondary)", letterSpacing: "0.05em" }}>Recent Activity</h5>
                      {notifs.recentUpdates.map((update: any) => (
                        <div key={update.id} style={{ padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", fontSize: "0.85rem" }}>
                          <p style={{ margin: 0, color: "var(--dash-text)", fontWeight: 600 }}>{update.message}</p>
                          {update.subMessage && (
                            <p style={{ margin: "4px 0 0 0", color: "var(--dash-text-secondary)", fontSize: "0.75rem", lineHeight: 1.4 }}>{update.subMessage}</p>
                          )}
                          <span style={{ fontSize: "0.7rem", color: "var(--dash-text-secondary)", marginTop: "6px", display: "block", opacity: 0.7 }}>
                            {new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!notifs.actionRequiredStatus && (!notifs.recentUpdates || notifs.recentUpdates.length === 0) && (
                    <div style={{ color: "var(--dash-text-secondary)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>No new notifications</div>
                  )}
                </div>
              )}
            </div>

            <span className={styles.greeting}>
              Hi, <strong>{user.name.split(" ")[0]}</strong>
            </span>
          </div>
        </header>

        {/* Global Broadcasts */}
        {notifs.broadcasts.map((b) => !dismissedBroadcasts.includes(b.id) && (
          <div key={b.id} className={`${styles.broadcast} ${b.type === "INFO" ? styles.broadcastInfo : ""}`}>
            <div className={styles.broadcastContent}>
              <span className={styles.broadcastIcon}>{b.type === "WARNING" ? "⚠️" : "ℹ️"}</span>
              <span>{b.message}</span>
            </div>
            <button className={styles.dismissBtn} onClick={() => setDismissedBroadcasts([...dismissedBroadcasts, b.id])}>×</button>
          </div>
        ))}

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
