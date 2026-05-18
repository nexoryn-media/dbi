"use client";

import { useState, useEffect } from "react";
import styles from "./accounts.module.css";

interface Tenant {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  number: string;
  address?: string;
  type: string;
  status: string;
  tenants: { id: string; name: string }[];
  createdAt: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    number: "",
    address: "",
    type: "low",
    status: "ACTIVE",
    tenantIds: [] as string[],
  });

  const [submitting, setSubmitting] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false); // Combined modal for Create/Edit

  const [activeTab, setActiveTab] = useState<"ACTIVE" | "UNASSIGNED">("ACTIVE");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const data = await authRes.json();
      setIsAdmin(data.user?.role === "ADMIN");

      const [accRes, tenRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/tenants"),
      ]);

      const accData = await accRes.json();
      const tenData = await tenRes.json();

      if (accRes.ok) setAccounts(accData.accounts);
      if (tenRes.ok) setTenants(tenData.tenants);
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTenantSelection = (tenantId: string) => {
    setFormData(prev => ({
      ...prev,
      tenantIds: prev.tenantIds.includes(tenantId) ? prev.tenantIds.filter(id => id !== tenantId) : [...prev.tenantIds, tenantId]
    }));
  };

  const openCreateModal = () => {
    setEditingAccountId(null);
    setFormData({
      name: "",
      number: "",
      address: "",
      type: "low",
      status: "ACTIVE",
      tenantIds: [],
    });
    setShowModal(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccountId(acc.id);
    setFormData({
      name: acc.name,
      number: acc.number,
      address: acc.address || "",
      type: acc.type,
      status: acc.status,
      tenantIds: acc.tenants.map(t => t.id),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.number) return;

    setSubmitting(true);
    try {
      const url = editingAccountId ? `/api/accounts/${editingAccountId}` : "/api/accounts";
      const method = editingAccountId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        fetchInitialData();
      }
    } catch (err) {
      console.error("Operation failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure? This will remove the account from the vault.")) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (res.ok) fetchInitialData();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const filteredAccounts = isAdmin
    ? accounts.filter(acc => activeTab === "ACTIVE" ? acc.tenants.length > 0 : acc.tenants.length === 0)
    : accounts;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Secure Payment Vault</h1>
          <p className={styles.subtitle}>Provision and manage banking resources</p>
        </div>
        {isAdmin && (
          <button className={styles.addBtn} onClick={openCreateModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Provision Account
          </button>
        )}
      </header>

      {isAdmin && (
        <div className={styles.adminFiltersArea}>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === "ACTIVE" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("ACTIVE")}
            >
              Active
            </button>
            <button 
              className={`${styles.tab} ${activeTab === "UNASSIGNED" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("UNASSIGNED")}
            >
              Unassigned
            </button>
          </div>
        </div>
      )}

      <h2 className={styles.sectionTitle}>
        {isAdmin ? (activeTab === "ACTIVE" ? "Active Accounts" : "Unassigned Accounts") : "Active Accounts"}
      </h2>

      {loading ? (
        <div className={styles.emptyState}>Synchronizing with secure vault...</div>
      ) : filteredAccounts.length === 0 ? (
        <div className={styles.emptyState}>No accounts found.</div>
      ) : (
        <div className={styles.accountGrid}>
          {filteredAccounts.map((acc) => (
            <div key={acc.id} className={styles.accountCard}>
              <div className={styles.accountCardMain}>
                <div className={styles.accountCardHeader}>
                  <h3 className={styles.accountName}>{acc.name}</h3>
                  {isAdmin && (
                    <div className={styles.cardActions}>
                      <button className={styles.copyBtn} onClick={() => openEditModal(acc)}>Edit</button>
                      <button className={styles.deleteBtn} onClick={() => handleDeleteAccount(acc.id)}>Delete</button>
                    </div>
                  )}
                </div>
                <div className={styles.accountAddress}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    </svg>
                    {acc.address || "No address provided"}
                </div>
                <div style={{ marginTop: '8px', fontSize: '1rem', color: 'var(--dash-text)' }}>
                  {acc.number}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ textTransform: "uppercase", fontSize: "0.75rem", fontWeight: 700, color: "var(--dash-accent)" }}>
                      {acc.type}
                  </span>
                  <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: "4px", 
                    fontSize: "0.7rem", 
                    fontWeight: 700,
                    background: acc.status === "ACTIVE" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    color: acc.status === "ACTIVE" ? "#22c55e" : "#ef4444"
                  }}>
                    {acc.status}
                  </span>
                </div>

                <div className={styles.userAvatars}>
                  {isAdmin ? (
                    <div>
                      <span className={styles.userLabel}>Assigned Brands:</span>
                      <div className={styles.assignedList} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {acc.tenants.length > 0 ? acc.tenants.map(t => (
                          <span key={t.id} className={styles.tenantPill}>
                            {t.name}
                          </span>
                        )) : <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>None</span>}
                      </div>
                    </div>
                  ) : (
                    <span className={styles.userLabel}>Verified Account</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified Compact Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.compactModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingAccountId ? "Edit Account" : "Provision Account"}</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.compactForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Account Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Number / IBAN</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.number}
                    onChange={e => setFormData({ ...formData, number: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Bank Address</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, Country"
                />
              </div>

              <div className={styles.chipSection}>
                <label className={styles.label}>Priority Type</label>
                <div className={styles.chipGrid}>
                  {["low", "high", "ftd"].map(t => (
                    <div
                      key={t}
                      className={`${styles.userChip} ${formData.type === t ? styles.userChipActive : ""}`}
                      onClick={() => setFormData({ ...formData, type: t })}
                    >
                      {t.toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.chipSection}>
                <label className={styles.label}>Account Status</label>
                <div className={styles.chipGrid}>
                  {["ACTIVE", "INACTIVE"].map(s => (
                    <div
                      key={s}
                      className={`${styles.userChip} ${formData.status === s ? styles.userChipActive : ""}`}
                      onClick={() => setFormData({ ...formData, status: s })}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.chipSection}>
                <label className={styles.label}>Assign Brands</label>
                <div className={styles.chipGrid}>
                  {tenants.map(t => (
                    <div
                      key={t.id}
                      className={`${styles.userChip} ${formData.tenantIds.includes(t.id) ? styles.userChipActive : ""}`}
                      onClick={() => toggleTenantSelection(t.id)}
                    >
                      {t.name}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? "Processing..." : (editingAccountId ? "Save Changes" : "Provision Account")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
