"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "../../components/Topbar";
import { PageHeader } from "../../components/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import { Avatar } from "../../components/ui/Avatar";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { TableSkeleton } from "../../components/Skeleton";
import { EyeIcon } from "../../components/Icons";
import { ConfirmDialog } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { BulkActionsBar, BulkCheckbox } from "../../components/BulkActionsBar";
import { useBulkSelection } from "../../lib/use-bulk-selection";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { formatDate } from "../../lib/format";
import type { AdvisorApplication } from "../../lib/types";

////////////////// fffffffffffffffffffffff

const TABS = [
  { value: "all", label: "All" },
  { value: "new", label: "Application" },
  { value: "pending_review", label: "Pending Review" },
  { value: "scheduled", label: "Interview Scheduled" },
  { value: "live_interview", label: "Live Interview" },
  { value: "under_review", label: "Under Review" },
  { value: "awaiting_signature", label: "Awaiting Signature" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "awaiting_submission", label: "Awaiting Submission" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Not Selected" },
];

export default function AdvisorApprovalsPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdvisorApplication[]>([]);
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const bulk = useBulkSelection(items);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<AdvisorApplication[]>("/admin/advisor-applications", {
        page,
        limit,
        status: tab === "all" ? undefined : tab,
        q: q || undefined,
      });
      setItems(r.data || []);
      setTotal(r.meta?.total || 0);
      bulk.clear();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load applications";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, limit, q]);

  const handleBulkDelete = async () => {
    if (bulk.selectedCount === 0) return;
    setActionLoading(true);
    const ids = bulk.selectedArray;
    const results = await Promise.allSettled(
      ids.map((id) => api.delete(`/admin/advisor-applications/${id}`))
    );
    setActionLoading(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    const ok = results.length - failed;
    if (ok > 0)
      toast.success(`Deleted ${ok} application${ok === 1 ? "" : "s"}`);
    if (failed > 0)
      toast.error(`${failed} delete${failed === 1 ? "" : "s"} failed`);
    setBulkConfirm(false);
    load();
  };

  return (
    <>
      <Topbar
        searchPlaceholder="Search applications by applicant, email, or expertise ..."
        onSearch={(value) => {
          setPage(1);
          setQ(value);
        }}
      />
      <main className="px-6 md:px-8 pb-10">
        <PageHeader
          title="Advisor Approvals"
          breadcrumb={[
            { label: "Dashboard", href: "/" },
            { label: "Advisor Approvals" },
          ]}
        />

        <div className="mb-6">
          <Tabs tabs={TABS} active={tab} onChange={(v) => { setTab(v); setPage(1); }} />
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/50 p-3 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
          <Input
            placeholder="Search applicant, email, or expertise..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="sm:w-80 lg:w-96"
          />
          <Select
            value={tab}
            onChange={(e) => {
              setTab(e.target.value);
              setPage(1);
            }}
            className="sm:w-56"
          >
            {TABS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>
        </div>

        <BulkActionsBar
          selectedCount={bulk.selectedCount}
          onClear={bulk.clear}
          onDelete={() => setBulkConfirm(true)}
        />

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="pl-5 pr-2 py-4 font-medium w-10">
                      <BulkCheckbox
                        ariaLabel="Select all on this page"
                        checked={bulk.allSelected}
                        indeterminate={bulk.someSelected}
                        onChange={bulk.toggleAll}
                      />
                    </th>
                    <th className="px-5 py-4 font-medium">Advisor</th>
                    <th className="px-5 py-4 font-medium">Submitted</th>
                    <th className="px-5 py-4 font-medium">Type</th>
                    <th className="px-5 py-4 font-medium">Stage</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        No applications
                      </td>
                    </tr>
                  ) : (
                    items.map((a) => {
                      const selected = bulk.isSelected(a._id);
                      return (
                      <tr
                        key={a._id}
                        className={`border-b border-slate-50 last:border-0 ${
                          selected ? "bg-amber-50/60" : ""
                        }`}
                      >
                        <td className="pl-5 pr-2 py-3 w-10">
                          <BulkCheckbox
                            ariaLabel={`Select ${a.user?.name || "application"}`}
                            checked={selected}
                            onChange={() => bulk.toggle(a._id)}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar src={a.user?.profilePhoto} name={a.user?.name} size={32} />
                            <span className="font-medium text-slate-900">{a.user?.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatDate(a.createdAt, true)}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {(a.expertise && a.expertise[0]) || "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone="info">{stageLabel(a.stage)}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/advisor-approvals/${a._id}`}
                            className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline text-sm font-medium"
                          >
                            <EyeIcon size={16} />
                            Review Details
                          </Link>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-5 py-3">
            <Pagination
              page={page}
              limit={limit}
              total={total}
              onPage={setPage}
              onLimit={(l) => { setLimit(l); setPage(1); }}
            />
          </div>
        </div>

        <ConfirmDialog
          open={bulkConfirm}
          onClose={() => setBulkConfirm(false)}
          onConfirm={handleBulkDelete}
          title={`Delete ${bulk.selectedCount} application${
            bulk.selectedCount === 1 ? "" : "s"
          }?`}
          description="This permanently removes the selected applications and cannot be undone."
          confirmText="Delete"
          danger
          loading={actionLoading}
        />
      </main>
    </>
  );
}

function stageLabel(stage?: string) {
  switch (stage) {
    case "application":
      return "Application";
    case "pre_recorded_interview":
      return "Pending Review";
    case "live_interview":
      return "Live Interview";
    case "contract":
      return "Stage 4 - Contract";
    case "decision":
      return "Decision";
    default:
      return stage || "—";
  }
}
