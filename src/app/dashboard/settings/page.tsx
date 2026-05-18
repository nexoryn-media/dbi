"use client";

import { useState, useEffect } from "react";
import styles from "./settings.module.css";
import { PREMADE_THEMES } from "@/lib/theme-constants";

interface TenantInfo {
  name: string;
  slug: string;
  domain: string;
  pageTitle: string;
  theme: Record<string, unknown>;
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    pageTitle: "",
    metaDescription: "",
    logoUrl: "",
    sidebarTitle: "",
    logoSize: "28px",
    // Granular Radius
    radiusCard: "12px",
    radiusButton: "8px",
    radiusInput: "8px",
    // Detailed Colors
    primaryColor: "#3b82f6",
    accentColor: "#8b5cf6",
    successColor: "#22c55e",
    warningColor: "#f59e0b",
    errorColor: "#ef4444",
    background: "#09090b",
    surface: "#18181b",
    sidebarBg: "#18181b",
    topbarBg: "#09090b",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (data) => {
        if (data.user) {
          setUserRole(data.user.role);
          if (data.user.tenant?.slug) {
            const res = await fetch(`/api/tenants/${data.user.tenant.slug}`);
            const tenantData = await res.json();
            const t = tenantData.tenant;
            setTenant(t);
            
            const theme = (t.theme || {}) as any;
            const colors = theme.colors || {};
            
            setFormData({
              pageTitle: t.pageTitle || "",
              metaDescription: t.metaDescription || "",
              logoUrl: theme.logoUrl || "",
              sidebarTitle: theme.brandName || "",
              logoSize: theme.logoSize || "28px",
              radiusCard: theme.radiusCard || "12px",
              radiusButton: theme.radiusButton || "8px",
              radiusInput: theme.radiusInput || "8px",
              primaryColor: colors.primary || "#3b82f6",
              accentColor: colors.accent || "#8b5cf6",
              successColor: colors.success || "#22c55e",
              warningColor: colors.warning || "#f59e0b",
              errorColor: colors.error || "#ef4444",
              background: colors.background || "#09090b",
              surface: colors.surface || "#18181b",
              sidebarBg: colors.sidebarBg || "#18181b",
              topbarBg: colors.topbarBg || "#09090b",
            });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setSaving(true);
    setMessage(null);

    try {
      const currentTheme = (tenant.theme || {}) as any;
      const { faviconUrl: _faviconUrl, ...themeWithoutDerivedFavicon } = currentTheme;
      const updatedTheme = {
        ...themeWithoutDerivedFavicon,
        logoUrl: formData.logoUrl,
        brandName: formData.sidebarTitle,
        logoSize: formData.logoSize,
        radiusCard: formData.radiusCard,
        radiusButton: formData.radiusButton,
        radiusInput: formData.radiusInput,
        colors: {
          ...(currentTheme.colors || {}),
          primary: formData.primaryColor,
          accent: formData.accentColor,
          success: formData.successColor,
          warning: formData.warningColor,
          error: formData.errorColor,
          background: formData.background,
          surface: formData.surface,
          sidebarBg: formData.sidebarBg,
          topbarBg: formData.topbarBg,
        }
      };

      const res = await fetch(`/api/tenants/${tenant.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageTitle: formData.pageTitle,
          metaDescription: formData.metaDescription,
          theme: updatedTheme,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      setTenant(data.tenant);
      setMessage({ type: "success", text: "Settings updated successfully. Refreshing..." });
      
      // Delay slightly so the user sees the success message, then reload to apply SSR styles
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      setMessage({ 
        type: "error", 
        text: err instanceof Error ? err.message : "An error occurred" 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <span>Loading settings...</span>
      </div>
    );
  }

  if (!tenant) return null;

  const canEdit = userRole === "ADMIN";

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard Settings</h1>
        <p className={styles.pageSubtitle}>Manage your portal's configuration, branding, and preferences.</p>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* --- Theme Presets --- */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Theme Presets</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {PREMADE_THEMES.map(theme => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    primaryColor: theme.colors.primary,
                    accentColor: theme.colors.accent,
                    successColor: theme.colors.success,
                    warningColor: theme.colors.warning,
                    errorColor: theme.colors.error,
                    background: theme.colors.background,
                    surface: theme.colors.surface,
                    sidebarBg: theme.colors.sidebarBg,
                    topbarBg: theme.colors.topbarBg,
                  }));
                }}
                disabled={!canEdit}
                style={{
                  background: theme.colors.surface,
                  border: `1px solid ${formData.background === theme.colors.background && formData.primaryColor === theme.colors.primary ? theme.colors.primary : theme.colors.background}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: 'white',
                  cursor: canEdit ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'flex-start',
                  minWidth: '140px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{theme.name}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: theme.colors.primary }} />
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: theme.colors.accent }} />
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: theme.colors.background }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>General & SEO</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label className={styles.infoLabel}>Browser Tab Title</label>
              <input
                className={styles.inputField}
                value={formData.pageTitle}
                onChange={(e) => setFormData({ ...formData, pageTitle: e.target.value })}
                readOnly={!canEdit}
              />
            </div>
            <div className={styles.infoItem}>
              <label className={styles.infoLabel}>Sidebar Title</label>
              <input
                className={styles.inputField}
                value={formData.sidebarTitle}
                onChange={(e) => setFormData({ ...formData, sidebarTitle: e.target.value })}
                readOnly={!canEdit}
                placeholder="e.g. Dashboard"
              />
            </div>
            <div className={styles.infoItem}>
              <label className={styles.infoLabel}>Logo URL</label>
              <input
                className={styles.inputField}
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                readOnly={!canEdit}
              />
            </div>
            <div className={styles.infoItem} style={{ gridColumn: 'span 3' }}>
              <label className={styles.infoLabel}>Meta Description</label>
              <input
                className={styles.inputField}
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                readOnly={!canEdit}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Live Branding Preview</h2>
          <div style={{ 
            background: formData.background, 
            padding: '40px', 
            borderRadius: '12px',
            border: '1px solid var(--dash-border)',
            display: 'flex',
            gap: '24px',
            overflow: 'hidden'
          }}>
            {/* Mini Sidebar */}
            <div style={{
              width: '120px',
              background: formData.sidebarBg,
              border: '1px solid var(--dash-border)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ height: '8px', width: '40px', background: formData.primaryColor, borderRadius: '2px', marginBottom: '8px' }} />
              {[1, 2, 3].map(i => {
                const isLight = parseInt(formData.sidebarBg.replace('#', '').substring(0,2), 16) > 128;
                return (
                  <div key={i} style={{ 
                    height: '6px', 
                    width: '100%', 
                    background: i === 1 ? colorMix(formData.accentColor, 20) : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'), 
                    borderRadius: formData.radiusButton,
                    borderLeft: i === 1 ? `2px solid ${formData.accentColor}` : 'none'
                  }} />
                );
              })}
            </div>

            {/* Mini Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Topbar */}
              <div style={{ 
                height: '32px', 
                background: formData.topbarBg, 
                border: '1px solid var(--dash-border)',
                borderRadius: '8px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
              }}>
                {(() => {
                  const isLight = parseInt(formData.topbarBg.replace('#', '').substring(0,2), 16) > 128;
                  return <div style={{ height: '12px', width: '12px', background: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />;
                })()}
              </div>

              {/* Content Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ 
                  background: formData.surface, 
                  border: '1px solid var(--dash-border)', 
                  borderRadius: formData.radiusCard,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {(() => {
                    const isLight = parseInt(formData.surface.replace('#', '').substring(0,2), 16) > 128;
                    return (
                      <>
                        <div style={{ height: '10px', width: '30px', background: colorMix(formData.accentColor, 20), borderRadius: '4px' }} />
                        <div style={{ height: '14px', width: '60px', background: isLight ? '#18181b' : 'white', opacity: 0.9, borderRadius: '4px' }} />
                        <div style={{ height: '8px', width: '100%', background: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '2px' }} />
                      </>
                    );
                  })()}
                </div>
                <div style={{ 
                  background: formData.surface, 
                  border: '1px solid var(--dash-border)', 
                  borderRadius: formData.radiusCard,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ 
                    height: '24px', 
                    width: '100%', 
                    background: formData.primaryColor, 
                    borderRadius: formData.radiusButton,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>ACTION</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Global Colors</h2>
          <div className={styles.infoGrid}>
            <ColorInput 
              label="Primary Action" 
              id="c-primary" 
              value={formData.primaryColor} 
              onChange={(val) => setFormData({ ...formData, primaryColor: val })} 
              canEdit={canEdit}
            />
            <ColorInput 
              label="Accent / Highlights" 
              id="c-accent" 
              value={formData.accentColor} 
              onChange={(val) => setFormData({ ...formData, accentColor: val })} 
              canEdit={canEdit}
            />
            <ColorInput 
              label="Success Indicator" 
              id="c-success" 
              value={formData.successColor} 
              onChange={(val) => setFormData({ ...formData, successColor: val })} 
              canEdit={canEdit}
            />
            <ColorInput 
              label="Warning Indicator" 
              id="c-warning" 
              value={formData.warningColor} 
              onChange={(val) => setFormData({ ...formData, warningColor: val })} 
              canEdit={canEdit}
            />
            <ColorInput 
              label="Error Indicator" 
              id="c-error" 
              value={formData.errorColor} 
              onChange={(val) => setFormData({ ...formData, errorColor: val })} 
              canEdit={canEdit}
            />
            <ColorInput 
              label="Main Background" 
              id="c-bg" 
              value={formData.background} 
              onChange={(val) => setFormData({ ...formData, background: val })} 
              canEdit={canEdit}
            />
            <ColorInput 
              label="Card Surface" 
              id="c-surface" 
              value={formData.surface} 
              onChange={(val) => setFormData({ ...formData, surface: val })} 
              canEdit={canEdit}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Layout Specifics</h2>
          <div className={styles.infoGrid}>
            <ColorInput 
              label="Sidebar Background" 
              id="c-sidebar" 
              value={formData.sidebarBg} 
              onChange={(val) => setFormData({ ...formData, sidebarBg: val })} 
              canEdit={canEdit}
            />
            <ColorInput 
              label="Topbar Background" 
              id="c-topbar" 
              value={formData.topbarBg} 
              onChange={(val) => setFormData({ ...formData, topbarBg: val })} 
              canEdit={canEdit}
            />
            <div className={styles.infoItem}>
              <label className={styles.infoLabel}>Sidebar Logo Size</label>
              <select
                className={styles.inputField}
                value={formData.logoSize}
                onChange={(e) => setFormData({ ...formData, logoSize: e.target.value })}
                disabled={!canEdit}
              >
                <option value="20px">Small (20px)</option>
                <option value="24px">Normal (24px)</option>
                <option value="28px">Standard (28px)</option>
                <option value="32px">Large (32px)</option>
                <option value="40px">Extra Large (40px)</option>
                <option value="48px">Huge (48px)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Border Radius Groups</h2>
          <div className={styles.infoGrid}>
            <RadiusSelect 
              label="Cards & Panels" 
              id="r-card" 
              value={formData.radiusCard} 
              onChange={(val) => setFormData({ ...formData, radiusCard: val })} 
              canEdit={canEdit}
            />
            <RadiusSelect 
              label="Buttons & Actions" 
              id="r-btn" 
              value={formData.radiusButton} 
              onChange={(val) => setFormData({ ...formData, radiusButton: val })} 
              canEdit={canEdit}
            />
            <RadiusSelect 
              label="Inputs & Selects" 
              id="r-input" 
              value={formData.radiusInput} 
              onChange={(val) => setFormData({ ...formData, radiusInput: val })} 
              canEdit={canEdit}
            />
          </div>
        </div>

        {canEdit && (
          <div className={styles.buttonRow}>
            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? "Saving..." : "Save Branding Changes"}
            </button>
          </div>
        )}
      </form>




      <div className={styles.section} style={{ marginTop: '48px' }}>
        <h2 className={styles.sectionTitle}>Configuration Snapshot (JSON)</h2>
        <div className={styles.codeBlock}>
          <pre>{JSON.stringify(withoutDerivedFavicon(tenant.theme), null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

function withoutDerivedFavicon(theme: Record<string, unknown>) {
  const { faviconUrl: _faviconUrl, ...rest } = theme;
  return rest;
}

// Helper to mimic CSS color-mix in JS for the preview
function colorMix(baseColor: string, percentage: number) {
  return `color-mix(in srgb, ${baseColor} ${percentage}%, transparent)`;
}

interface ColorInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (val: string) => void;
  canEdit: boolean;
}

function ColorInput({ label, id, value, onChange, canEdit }: ColorInputProps) {
  return (
    <div className={styles.infoItem}>
      <label className={styles.infoLabel} htmlFor={id}>{label}</label>
      {canEdit ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id={id}
            type="color"
            className={styles.inputField}
            style={{ width: '40px', padding: '2px', height: '38px' }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            className={styles.inputField}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: value }} />
          <span className={styles.infoValue}>{value}</span>
        </div>
      )}
    </div>
  );
}

interface RadiusSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (val: string) => void;
  canEdit: boolean;
}

function RadiusSelect({ label, id, value, onChange, canEdit }: RadiusSelectProps) {
  return (
    <div className={styles.infoItem}>
      <label className={styles.infoLabel} htmlFor={id}>{label}</label>
      {canEdit ? (
        <select
          id={id}
          className={styles.inputField}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="0px">None (Square)</option>
          <option value="4px">Small (4px)</option>
          <option value="8px">Medium (8px)</option>
          <option value="12px">Large (12px)</option>
          <option value="16px">Extra Large (16px)</option>
          <option value="9999px">Full (Pill)</option>
        </select>
      ) : (
        <span className={styles.infoValue}>{value}</span>
      )}
    </div>
  );
}
