"use client";

import { useState, useEffect } from "react";
import styles from "./brands.module.css";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  pageTitle: string;
  _count: {
    users: number;
    requests: number;
    accounts: number;
  };
  createdAt: string;
}

export default function BrandsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (res.ok) {
        setTenants(data.tenants);
      }
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          slug: newSlug,
          domain: newDomain,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewName("");
        setNewSlug("");
        setNewDomain("");
        fetchTenants();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create brand");
      }
    } catch (err) {
      alert("Error creating brand");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action might fail if there are active users/requests.`)) return;

    try {
      const res = await fetch(`/api/tenants/mgmt/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTenants(tenants.filter(t => t.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete brand");
      }
    } catch (err) {
      alert("Error deleting brand");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className={styles.title}>Brand Management</h1>
            <p className={styles.subtitle}>Provision and monitor all platform tenants from a central control center.</p>
          </div>
          <button 
            className={styles.addBtn}
            onClick={() => setShowCreateModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Provision New Brand
          </button>
        </div>
      </header>

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Provision New Brand</h2>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTenant} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Brand Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="e.g. Global Logistics"
                  value={newName}
                  onChange={e => {
                    setNewName(e.target.value);
                    if (!newSlug) setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                  }}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Slug (URL ID)</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="e.g. global-logistics"
                  value={newSlug}
                  onChange={e => setNewSlug(e.target.value)}
                  required
                />
                <small className={styles.helpText}>Used for subdomain: slug.domain.com</small>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Custom Domain (Optional)</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="e.g. portal.global.com"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? "Provisioning..." : "Initialize Brand"}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.emptyState}>Loading brands...</div>
      ) : (
        <div className={styles.grid}>
          {tenants.map(tenant => (
            <div key={tenant.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.brandName}>{tenant.name}</h3>
                <div className={styles.actions}>
                  <button 
                    className={styles.iconBtn} 
                    onClick={() => window.location.href = `/dashboard/settings?tenantId=${tenant.id}`}
                    title="Edit Branding"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                    title="Delete Brand"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Domain:</span>
                  <span className={styles.infoValue}>{tenant.domain}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Slug:</span>
                  <span className={styles.infoValue}>{tenant.slug}</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.stat}>
                  <span className={styles.statVal}>{tenant._count.users}</span>
                  <span className={styles.statLabel}>Users</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statVal}>{tenant._count.requests}</span>
                  <span className={styles.statLabel}>Requests</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statVal}>{tenant._count.accounts}</span>
                  <span className={styles.statLabel}>Accounts</span>
                </div>
              </div>
              
              <button 
                className={styles.viewBtn}
                onClick={() => {
                  // In production this would open the subdomain
                  const protocol = window.location.protocol;
                  const hostname = window.location.hostname;
                  const port = window.location.port;
                  const parts = hostname.split('.');
                  // If we have subdomains (e.g. alpha.localhost or sub.domain.com), take everything after the first part
                  const rootDomain = parts.length > 1 ? parts.slice(1).join('.') : hostname;
                  const baseDomain = port ? `${rootDomain}:${port}` : rootDomain;
                  window.open(`${protocol}//${tenant.slug}.${baseDomain}`, '_blank');
                }}
              >
                Visit Portal
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
