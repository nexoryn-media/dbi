"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./requests.module.css";

interface Request {
  id: string;
  req_name: string;
  req_geo: string;
  req_amo: string;
  req_type: string;
  req_numb?: string;
  req_acc?: string;
  status: string;
  fileUrl?: string;
  submittedAt: string;
  pendingAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  attachmentApprovedAt?: string;
  moneyArrivedAt?: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    brand?: string;
    merchant?: string;
  };
  tenant: {
    id: string;
    name: string;
  };
}

interface AccountOption {
  id: string;
  name: string;
  number: string;
  type: string;
}

interface UserInfo {
  role: string;
}

const STATUS_OPTIONS = ["SUBMITTED", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Requests",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function RequestsContent() {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status") || "";

  const [requests, setRequests] = useState<Request[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState(urlStatus);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [formData, setFormData] = useState({ req_name: "", req_geo: "", req_amo: "", req_type: "Low" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [cancellingReqId, setCancellingReqId] = useState<string | null>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  
  // Account Assignment State
  const [assigningReq, setAssigningReq] = useState<Request | null>(null);
  const [tenantAccounts, setTenantAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with URL
  useEffect(() => {
    setFilterStatus(urlStatus);
  }, [urlStatus]);

  // Fetch current user info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUserInfo({ role: data.user.role }))
      .catch(console.error);
  }, []);

  const isAdmin = userInfo?.role === "ADMIN";

  const fetchRequests = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: "15" });
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();

      if (res.ok) {
        setRequests(data.requests);
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filterStatus]);

  useEffect(() => {
    fetchRequests();
    const fetchRequestsInterval = setInterval(() => fetchRequests(false), 10000);
    return () => clearInterval(fetchRequestsInterval);
  }, [fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({ req_name: "", req_geo: "", req_amo: "", req_type: "Low" });
        fetchRequests();
      } else {
        const data = await res.json();
        setFormError(data.error || "Failed to submit request");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateRequest = async (id: string, updates: Record<string, any>) => {
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        if (updates.status === "CANCELLED") setCancellingReqId(null);
        // Refresh the whole list so it moves tabs correctly
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || "Update failed");
      }
    } catch (error) {
      console.error("Failed to update request:", error);
    }
  };

  const handleAdminApproveClick = async (req: Request) => {
    setAssigningReq(req);
    // Fetch accounts for this tenant
    try {
      const res = await fetch(`/api/accounts?tenantId=${req.tenant.id}`);
      const data = await res.json();
      if (res.ok) {
        setTenantAccounts(data.accounts);
      }
    } catch (err) {
      console.error("Failed to fetch tenant accounts", err);
    }
  };

  const handleConfirmAssignment = () => {
    if (!assigningReq || !selectedAccountId) return;
    const acc = tenantAccounts.find(a => a.id === selectedAccountId);
    if (!acc) return;
    
    updateRequest(assigningReq.id, { 
      status: "PENDING", 
      req_numb: acc.number, 
      req_acc: acc.name 
    });
    setAssigningReq(null);
    setSelectedAccountId("");
  };

  const handleFileUpload = (id: string) => {
    setActiveUploadId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadId) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        updateRequest(activeUploadId, { fileUrl: data.fileUrl });
      } else {
        const data = await res.json();
        alert(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Network error during upload");
    } finally {
      setActiveUploadId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  const formatAmount = (val: string) => {
    if (!val) return "";
    // Clean string to get only numbers
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return val;
    // Format with spaces
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{filterStatus ? STATUS_LABELS[filterStatus] : "All Requests"}</h1>
          <p className={styles.pageSubtitle}>
            {isAdmin ? "Manage workflow steps" : "Monitor your request status"}
          </p>
        </div>
        {filterStatus === "SUBMITTED" && (
          <button
            className={styles.newRequestBtn}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "New Request"}
          </button>
        )}
      </div>

      {/* New Request Form Modal */}
      {showForm && (
        <div className={styles.formBackdrop} onClick={() => setShowForm(false)}>
          <div className={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.formClose} onClick={() => setShowForm(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <h3 className={styles.formTitle}>Submit a Request</h3>
            {formError && <div className={styles.formError}>{formError}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Client Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.req_name}
                    onChange={(e) => setFormData({ ...formData, req_name: e.target.value })}
                    placeholder="e.g. Mark Dudley"
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Country</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.req_geo}
                    onChange={(e) => setFormData({ ...formData, req_geo: e.target.value })}
                    placeholder="Germany"
                    required
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Amount (EUR)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.req_amo}
                    onChange={(e) => setFormData({ ...formData, req_amo: e.target.value })}
                    placeholder="e.g. 10000"
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Type</label>
                  <select
                    className={styles.formSelect}
                    value={formData.req_type}
                    onChange={(e) => setFormData({ ...formData, req_type: e.target.value })}
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Request List */}
      <div className={styles.requestList}>
        {loading ? (
          <div className={styles.loadingState}>Loading...</div>
        ) : requests.length === 0 ? (
          <div className={styles.emptyState}>
            {filterStatus === "PENDING" && "No pending requests currently."}
            {filterStatus === "CONFIRMED" && "No confirmed transactions currently."}
            {filterStatus === "COMPLETED" && "No completed transactions currently."}
            {(filterStatus === "SUBMITTED" || !filterStatus) && "No requests currently. Create one now with the button above"}
            {filterStatus === "CANCELLED" && "No cancelled requests currently."}
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className={styles.requestCard}>
              {((isAdmin && req.status !== "COMPLETED" && req.status !== "CANCELLED") ||
                (!isAdmin && req.status === "SUBMITTED")) && (
                  <button
                    className={styles.cardCancelBtn}
                    onClick={() => setCancellingReqId(req.id)}
                    title="Cancel Request"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              <div className={styles.requestHeader}>
                <div className={styles.requestTitleRow}>
                  <h3 className={styles.requestTitle}>{req.req_name}</h3>
                  <div className={styles.requestInfoCluster}>
                    <span className={styles.amountText}>{formatAmount(req.req_amo)}</span>
                    <span className={`${styles.typeBadge} ${req.req_type === "High" ? styles.typeHigh : ""}`}>
                      {req.req_type}
                    </span>
                  </div>
                </div>
                <div className={styles.requestMeta}>
                  <span className={styles.requestGeo}>{req.req_geo}</span>
                  <span className={styles.requestDate}>{formatDate(req.createdAt)}</span>
                </div>
                {isAdmin && (req.user.name || req.user.brand || req.user.merchant) && (
                  <div className={styles.adminExtraInfo} style={{ 
                    marginTop: '8px', 
                    padding: '8px 12px', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '6px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    fontSize: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {req.user.name && (
                      <div style={{ opacity: 0.8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--dash-accent)', marginRight: '4px' }}>USER:</span>
                        {req.user.name}
                      </div>
                    )}
                    {req.user.brand && (
                      <div style={{ opacity: 0.8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--dash-accent)', marginRight: '4px' }}>BRAND:</span>
                        {req.user.brand}
                      </div>
                    )}
                    {req.user.merchant && (
                      <div style={{ opacity: 0.8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--dash-accent)', marginRight: '4px' }}>MERCHANT:</span>
                        {req.user.merchant}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Workflow Info */}
              <div className={styles.workflowGrid}>
                {req.req_numb && (
                  <div className={styles.workflowItem}>
                    <label>Account Number</label>
                    <span>{req.req_numb}</span>
                  </div>
                )}
                {req.req_acc && (
                  <div className={styles.workflowItem}>
                    <label>Account Name</label>
                    <span>{req.req_acc}</span>
                  </div>
                )}
              </div>

              {/* History Timestamps */}
              <div className={styles.historyTimeline}>
                <div className={styles.timelineItem}>
                  <span className={styles.timelinePoint} />
                  <span className={styles.timelineLabel}>Submitted</span>
                  <span className={styles.timelineDate}>{formatDate(req.submittedAt)}</span>
                  {req.status === "SUBMITTED" && (
                    <div className={styles.cardProcessingNotice}>
                      <div className={styles.miniSpinner} />
                      <span>We are still processing your request. Thank you for your patience.</span>
                    </div>
                  )}
                </div>
                {req.pendingAt && (
                  <div className={styles.timelineItem}>
                    <span className={styles.timelinePoint} />
                    <span className={styles.timelineLabel}>Request Approved</span>
                    <span className={styles.timelineDate}>{formatDate(req.pendingAt)}</span>
                  </div>
                )}
                {req.attachmentApprovedAt && (
                  <div className={styles.timelineItem}>
                    <span className={styles.timelinePoint} />
                    <span className={styles.timelineLabel}>POP Approved</span>
                    <span className={styles.timelineDate}>{formatDate(req.attachmentApprovedAt)}</span>
                  </div>
                )}
                {req.attachmentApprovedAt && !req.moneyArrivedAt && !req.confirmedAt && (
                  <div className={styles.timelineItem}>
                    <span className={styles.timelinePoint} />
                    <span className={styles.timelineLabel}>Waiting for Arrival</span>
                    <div className={styles.cardProcessingNotice}>
                      <div className={styles.miniSpinner} />
                      <span>We are waiting for your deposit to arrive.</span>
                    </div>
                  </div>
                )}
                {req.moneyArrivedAt && (
                  <div className={styles.timelineItem}>
                    <span className={styles.timelinePoint} />
                    <span className={styles.timelineLabel}>Deposit is showing up as pending.</span>
                    <span className={styles.timelineDate}>{formatDate(req.moneyArrivedAt)}</span>
                    {!req.confirmedAt && (
                      <div className={styles.cardProcessingNotice}>
                        <div className={styles.miniSpinner} />
                        <span>Money has arrived, but are still pending. Please be patient this normally resolves in up to 24 hours</span>
                      </div>
                    )}
                  </div>
                )}

                {req.confirmedAt && (
                  <div className={styles.timelineItem}>
                    <span className={styles.timelinePoint} />
                    <span className={styles.timelineLabel}>Confirmed</span>
                    <span className={styles.timelineDate}>{formatDate(req.confirmedAt)}</span>
                    {!req.completedAt && (
                      <div className={styles.cardProcessingNotice}>
                        <div className={styles.miniSpinner} />
                        <span>Your transfer is confirmed, expect it to be settled within 2-3 business days.</span>
                      </div>
                    )}
                  </div>
                )}
                {req.completedAt && (
                  <div className={styles.timelineItem}>
                    <span className={styles.timelinePoint} />
                    <span className={styles.timelineLabel}>Completed</span>
                    <span className={styles.timelineDate}>{formatDate(req.completedAt)}</span>
                  </div>
                )}
              </div>

              {req.fileUrl && isAdmin && (
                <div className={styles.attachmentSection}>
                  <a href={req.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                    📎 View User Attachment
                  </a>
                </div>
              )}

              {/* Action Buttons based on Workflow */}
              <div className={styles.adminActions}>
                {isAdmin ? (
                  <>
                    {req.status === "SUBMITTED" && (
                      <button
                        className={styles.actionBtnPrimary}
                        onClick={() => handleAdminApproveClick(req)}
                      >
                        Approve & Assign Info
                      </button>
                    )}
                    {req.status === "PENDING" && (
                      <>
                        {req.fileUrl && !req.attachmentApprovedAt && (
                          <button
                            className={styles.actionBtnPrimary}
                            onClick={() => {
                              if (window.confirm("Are you sure you want to approve this attachment?")) {
                                updateRequest(req.id, { approveAttachment: true as any });
                              }
                            }}
                          >
                            Approve Attachment
                          </button>
                        )}
                        {req.attachmentApprovedAt && !req.moneyArrivedAt && (
                          <button
                            className={styles.actionBtnPrimary}
                            onClick={() => {
                              if (window.confirm("Mark money as arrived?")) {
                                updateRequest(req.id, { markMoneyArrived: true as any });
                              }
                            }}
                          >
                            Mark Money Arrived
                          </button>
                        )}
                        <button
                          className={styles.actionBtnPrimary}
                          onClick={() => {
                            if (window.confirm("Are you sure you want to confirm this request?")) {
                              updateRequest(req.id, { status: "CONFIRMED" });
                            }
                          }}
                        >
                          Confirm Request
                        </button>
                      </>
                    )}
                    {req.status === "CONFIRMED" && filterStatus === "CONFIRMED" && (
                      <button
                        className={styles.actionBtnPrimary}
                        onClick={() => {
                          if (window.confirm("Mark this request as completed?")) {
                            updateRequest(req.id, { status: "COMPLETED" });
                          }
                        }}
                      >
                        Mark Completed
                      </button>
                    )}
                    <button
                      className={styles.actionBtnDanger}
                      onClick={() => {
                        if (window.confirm("Are you sure you want to cancel this request?")) {
                          updateRequest(req.id, { status: "CANCELLED" });
                        }
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {req.status === "PENDING" && !req.attachmentApprovedAt && (
                      <div className={styles.previewCluster}>
                        <button
                          className={styles.actionBtnSecondary}
                          onClick={() => handleFileUpload(req.id)}
                        >
                          {req.fileUrl ? "Update Attachment" : "Upload Confirmation File"}
                        </button>
                        {req.fileUrl && (
                          <>
                            <img src={req.fileUrl} alt="Preview" className={styles.miniPreview} />
                            <button
                              className={styles.deleteAttachmentBtn}
                              onClick={() => updateRequest(req.id, { fileUrl: "" })}
                              title="Remove Attachment"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal Overlay */}
      {cancellingReqId && (
        <div className={styles.formBackdrop} onClick={() => setCancellingReqId(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Cancel Request?</h3>
            <p className={styles.confirmText}>
              Are you sure you want to cancel this request? This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelActionBtn}
                onClick={() => setCancellingReqId(null)}
              >
                No, Keep it
              </button>
              <button
                className={styles.confirmActionBtn}
                onClick={() => updateRequest(cancellingReqId, { status: "CANCELLED" })}
              >
                Yes, Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Assignment Modal Overlay */}
      {assigningReq && (
        <div className={styles.formBackdrop} onClick={() => {
          setAssigningReq(null);
          setSelectedAccountId("");
        }}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Assign Payment Account</h3>
            <p className={styles.confirmText}>
              Select an account assigned to <strong>{assigningReq.tenant.name}</strong> for this request.
            </p>
            
            <div style={{ margin: "1.5rem 0" }}>
              <select 
                className={styles.formSelect}
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", background: "var(--dash-background)", color: "var(--dash-text)", border: "1px solid var(--dash-border)", borderRadius: "8px" }}
              >
                <option value="" disabled>Select an account...</option>
                {tenantAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} - {acc.number} ({acc.type.toUpperCase()})
                  </option>
                ))}
              </select>
              {tenantAccounts.length === 0 && (
                <p style={{ color: "var(--dash-warning)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  This brand has no accounts assigned. Please assign one in the Accounts page first.
                </p>
              )}
            </div>

            <div className={styles.confirmActions}>
              <button
                className={styles.cancelActionBtn}
                onClick={() => {
                  setAssigningReq(null);
                  setSelectedAccountId("");
                }}
              >
                Cancel
              </button>
              <button
                className={styles.confirmActionBtn}
                disabled={!selectedAccountId}
                style={{ opacity: !selectedAccountId ? 0.5 : 1 }}
                onClick={handleConfirmAssignment}
              >
                Approve & Assign
              </button>
            </div>
          </div>
        </div>
      )}

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
      {/* Hidden File Input for Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RequestsContent />
    </Suspense>
  );
}
