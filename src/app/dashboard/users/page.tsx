"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./users.module.css";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  brand?: string;
  merchant?: string;
  createdAt: string;
  _count: { requests: number };
}

const STATUS_OPTIONS = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "statusPending",
  ACTIVE: "statusActive",
  SUSPENDED: "statusSuspended",
  REJECTED: "statusRejected",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: "15" });
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users);
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, filterStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateField = async (userId: string, field: string, value: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, [field]: value } : u))
        );
      }
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateStatus = async (userId: string, status: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status } : u))
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Users</h1>
          <p className={styles.pageSubtitle}>
            Manage users and their account statuses
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No users found</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Brand</th>
                <th>Merchant</th>
                <th>Requests</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.userAvatar}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.userMeta}>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.roleBadge}>
                      {user.role.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[STATUS_STYLES[user.status]]}`}>
                      {user.status.charAt(0) + user.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span className={styles.dateText}>{user.brand || "—"}</span>
                      <button 
                        onClick={() => {
                          const val = prompt("Enter Brand:", user.brand || "");
                          if (val !== null) updateField(user.id, 'brand', val);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--dash-accent)', cursor: 'pointer', fontSize: '10px' }}
                      >✎</button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span className={styles.dateText}>{user.merchant || "—"}</span>
                      <button 
                        onClick={() => {
                          const val = prompt("Enter Merchant:", user.merchant || "");
                          if (val !== null) updateField(user.id, 'merchant', val);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--dash-accent)', cursor: 'pointer', fontSize: '10px' }}
                      >✎</button>
                    </div>
                  </td>
                  <td>
                    <span className={styles.requestCount}>
                      {user._count.requests}
                    </span>
                  </td>
                  <td>
                    <span className={styles.dateText}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                    </span>
                  </td>
                  <td>
                    <select
                      className={styles.statusSelect}
                      value={user.status}
                      onChange={(e) => updateStatus(user.id, e.target.value)}
                      disabled={updatingId === user.id}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
