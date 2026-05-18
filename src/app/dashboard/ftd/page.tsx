"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./ftd.module.css";

interface Tenant {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  number: string;
  address?: string;
  tenants?: { id: string }[];
}

interface FtdTransaction {
  id: string;
  name: string;
  amount: number;
  settled: boolean;
  account: Account;
  tenant: Tenant;
  date: string;
  createdAt: string;
}

export default function FtdPage() {
  const [transactions, setTransactions] = useState<FtdTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tenantFtdAccount, setTenantFtdAccount] = useState<Account | null>(null);
  
  // Admin filters
  const [filterTenantId, setFilterTenantId] = useState<string>("ALL");

  // Sync tenantFtdAccount for admins when filter changes
  useEffect(() => {
    if (isAdmin && filterTenantId !== "ALL") {
      const tenantAcc = accounts.find(a => a.tenants?.some(t => t.id === filterTenantId));
      if (tenantAcc) setTenantFtdAccount(tenantAcc);
      else setTenantFtdAccount(null);
    } else if (isAdmin && filterTenantId === "ALL") {
      setTenantFtdAccount(null);
    }
  }, [filterTenantId, isAdmin, accounts]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    settled: false,
    accountId: "",
    tenantId: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill account when tenantId changes in formData
  useEffect(() => {
    if (formData.tenantId && !editingId) {
      const tenantAcc = accounts.find(a => a.tenants?.some(t => t.id === formData.tenantId));
      if (tenantAcc) {
        setFormData(prev => ({ ...prev, accountId: tenantAcc.id }));
      }
    }
  }, [formData.tenantId, accounts, editingId]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      const adminStatus = meData.user?.role === "ADMIN" || meData.user?.role === "SUPER_ADMIN";
      setIsAdmin(adminStatus);

      // Fetch transactions
      await fetchTransactions();

      if (adminStatus) {
        // Fetch tenants for admin dropdown
        const tenantsRes = await fetch("/api/tenants");
        const tenantsData = await tenantsRes.json();
        if (tenantsRes.ok) setTenants(tenantsData.tenants);

        // Fetch accounts (FTD only)
        const accRes = await fetch("/api/accounts");
        const accData = await accRes.json();
        if (accRes.ok) {
          const ftds = accData.accounts.filter((a: any) => a.type === "ftd");
          setAccounts(ftds);
        }
      } else {
        // Fetch specific FTD account for this tenant
        const accRes = await fetch("/api/accounts");
        const accData = await accRes.json();
        if (accRes.ok) {
          const tenantFtd = accData.accounts.find((a: any) => a.type === "ftd");
          if (tenantFtd) setTenantFtdAccount(tenantFtd);
        }
      }
    } catch (error) {
      console.error("Failed to fetch FTD data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (tenantId?: string) => {
    let url = "/api/ftd-transactions";
    if (tenantId && tenantId !== "ALL") {
      url += `?tenantId=${tenantId}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) setTransactions(data.transactions);
  };

  useEffect(() => {
    if (isAdmin && !loading) {
      fetchTransactions(filterTenantId);
    }
  }, [filterTenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingId ? `/api/ftd-transactions/${editingId}` : "/api/ftd-transactions";
      const method = editingId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingId(null);
        setFormData({
          name: "",
          amount: "",
          date: new Date().toISOString().split('T')[0],
          settled: false,
          accountId: "",
          tenantId: "",
        });
        fetchTransactions(filterTenantId);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save transaction");
      }
    } catch (err) {
      alert("Error saving transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSettled = async (tx: FtdTransaction) => {
    if (!isAdmin) return; // Only admins can toggle
    try {
      const res = await fetch(`/api/ftd-transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settled: !tx.settled }),
      });
      if (res.ok) {
        setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, settled: !tx.settled } : t));
      }
    } catch (err) {
      console.error("Failed to toggle settled", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await fetch(`/api/ftd-transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const openEditModal = (tx: FtdTransaction) => {
    setFormData({
      name: tx.name,
      amount: String(tx.amount),
      date: new Date(tx.date).toISOString().split('T')[0],
      settled: tx.settled,
      accountId: tx.account.id,
      tenantId: tx.tenant.id
    });
    setEditingId(tx.id);
    setShowModal(true);
  };

  const openAddModal = () => {
    const currentFilter = filterTenantId; // Capture current value
    const autoTenantId = currentFilter !== "ALL" ? currentFilter : "";
    let autoAccountId = "";

    if (autoTenantId) {
      const tenantAcc = accounts.find(a => a.tenants?.some(t => t.id === autoTenantId));
      if (tenantAcc) autoAccountId = tenantAcc.id;
    }

    setEditingId(null);
    setFormData({ 
      name: "", 
      amount: "", 
      date: new Date().toISOString().split('T')[0],
      settled: false, 
      accountId: autoAccountId, 
      tenantId: autoTenantId 
    });
    setShowModal(true);
  };

  const totals = useMemo(() => {
    return {
      count: transactions.length,
      received: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      settled: transactions.reduce((sum, tx) => sum + (tx.settled ? tx.amount : 0), 0)
    };
  }, [transactions]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>FTD Tracker</h1>
          <p className={styles.subtitle}>Manage First Time Deposits</p>
        </div>
        {isAdmin && (
          <button 
            className={styles.addBtn}
            onClick={openAddModal}
          >
            + Add Transaction
          </button>
        )}
      </header>

      {(isAdmin && filterTenantId === "ALL") ? (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "0.9rem", textTransform: "uppercase", color: "var(--dash-text-secondary)", letterSpacing: "0.05em" }}>Quick Access by Brand</h3>
          </div>
          <div className={styles.tenantGrid}>
            {tenants
              .filter(t => accounts.some(a => a.tenants?.some(ten => ten.id === t.id)))
              .map(tenant => {
                const tenantAcc = accounts.find(a => a.tenants?.some(t => t.id === tenant.id));
                return (
                  <div key={tenant.id} className={styles.tenantCard} onClick={() => setFilterTenantId(tenant.id)}>
                    <span className={styles.tenantName}>{tenant.name}</span>
                    <div className={styles.tenantAccInfo}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" />
                        <path d="M3 8h18" />
                      </svg>
                      {tenantAcc ? `${tenantAcc.name}` : "No FTD Account"}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      ) : (
        <div className={styles.topGrid}>
          {/* Tenant FTD Account Card */}
          {(!isAdmin || (isAdmin && filterTenantId !== "ALL")) && (
            <div className={styles.accountCard}>
              <div className={styles.cardInfo}>
                <span className={styles.cardBadge}>Payment Details</span>
                <div className={styles.cardDetails}>
                  <span className={styles.detailLabel}>Account Name</span>
                  <span className={styles.detailValue}>{tenantFtdAccount?.name || "N/A"}</span>
                  <span className={styles.detailLabel}>Account Number</span>
                  <span className={styles.detailValue}>{tenantFtdAccount?.number || "N/A"}</span>
                  {tenantFtdAccount?.address && (
                    <>
                      <span className={styles.detailLabel}>Bank Address</span>
                      <span className={styles.detailValue}>{tenantFtdAccount.address}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total FTDs</span>
              <span className={styles.statValue}>{totals.count}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Received</span>
              <span className={styles.statValue}>€{totals.received.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Settled</span>
              <span className={styles.statValue} style={{ color: "var(--dash-success)" }}>
                €{totals.settled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {(!isAdmin || filterTenantId !== "ALL") && (
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.emptyState}>Loading FTDs...</div>
          ) : transactions.length === 0 ? (
            <div className={styles.emptyState}>No FTD transactions found.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Amount</th>
                  <th>Account</th>
                  {isAdmin && filterTenantId === "ALL" && <th>Brand</th>}
                  <th>Settled</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.date).toLocaleDateString()}</td>
                    <td>{tx.name}</td>
                    <td className={styles.amount}>€{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{tx.account.name} ({tx.account.number})</td>
                    {isAdmin && filterTenantId === "ALL" && <td>{tx.tenant.name}</td>}
                    <td>
                      <button 
                        className={`${styles.settledToggle} ${tx.settled ? styles.settledYes : styles.settledNo}`}
                        onClick={() => toggleSettled(tx)}
                        disabled={!isAdmin}
                        style={{ cursor: isAdmin ? "pointer" : "default" }}
                      >
                        {tx.settled ? (
                          <>✓ Settled</>
                        ) : (
                          <>⌛ Pending</>
                        )}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className={styles.actions}>
                        <button className={styles.iconBtn} onClick={() => openEditModal(tx)}>Edit</button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(tx.id)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && isAdmin && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                {editingId ? "Edit FTD" : "Add FTD Transaction"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "var(--dash-text)", fontSize: "1.5rem", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Transaction Date</label>
                <input 
                  type="date" 
                  className={styles.input} 
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Amount (€)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className={styles.input} 
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Brand</label>
                <select 
                  className={styles.input} 
                  value={formData.tenantId}
                  onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                  required
                  disabled={!!editingId} // Don't change brand after creation easily
                >
                  <option value="" disabled>Select a brand...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>FTD Account</label>
                <select 
                  className={styles.input} 
                  value={formData.accountId}
                  onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                  required
                >
                  <option value="" disabled>Select an FTD account...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.number})</option>
                  ))}
                </select>
              </div>

              {!editingId && (
                <div className={styles.formGroup} style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                  <input 
                    type="checkbox" 
                    id="settled"
                    checked={formData.settled}
                    onChange={e => setFormData({ ...formData, settled: e.target.checked })}
                    style={{ width: "1rem", height: "1rem" }}
                  />
                  <label htmlFor="settled" className={styles.label} style={{ margin: 0, cursor: "pointer" }}>
                    Mark as Settled immediately
                  </label>
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={submitting} style={{ marginTop: "1rem" }}>
                {submitting ? "Saving..." : "Save Transaction"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
