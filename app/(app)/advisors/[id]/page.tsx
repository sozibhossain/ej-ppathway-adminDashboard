"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "../../../components/Topbar";
import { PageHeader } from "../../../components/PageHeader";
import { Avatar } from "../../../components/ui/Avatar";
import { Badge, StatusBadge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { DetailSkeleton } from "../../../components/Skeleton";
import { ConfirmDialog, Modal } from "../../../components/ui/Modal";
import { Input, Textarea } from "../../../components/ui/Input";
import { Combobox } from "../../../components/ui/Combobox";
import { api, ApiError } from "../../../lib/api";
import { useToast } from "../../../lib/toast";
import { formatCurrency, formatDate, formatRelative } from "../../../lib/format";
import type {
  AdvisorDateAvailability,
  AdvisorDaySchedule,
  AdvisorProfile,
  AdvisorScheduleSlot,
  AdvisorPricing,
  AdminUser,
  Wallet,
  AdvisorMetrics,
} from "../../../lib/types";
import {
  ADVISOR_EXPERTISE_OPTIONS,
  ADVISOR_STYLE_OPTIONS,
  TIER_OPTIONS,
  getTimezoneOptions,
} from "../../../lib/advisor-options";
import { StarIcon } from "../../../components/Icons";
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  Pencil,
  MessageSquare,
  KeyRound,
  Award,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCountries, useCities, useCountryName, formatLocation } from "../../../lib/countries";

type AdvisorDetailsResponse = {
  user: AdminUser;
  profile: AdvisorProfile | null;
  wallet: Wallet | null;
  sessionsAgg: Array<{ _id: string; count: number }>;
  metrics?: AdvisorMetrics;
};

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function isAudioMediaUrl(url: string) {
  return /\.(aac|aiff|flac|m4a|mp3|ogg|opus|wav)(\?|#|$)/i.test(url);
}

export default function AdvisorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const countryName = useCountryName();
  const [data, setData] = useState<AdvisorDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<AdvisorDetailsResponse>(`/admin/advisors/${id}`);
      setData(r.data || null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const suspendToggle = async () => {
    if (!data) return;
    setActionLoading(true);
    try {
      const isDeactivated = data.user.status === "deactivated" || data.user.status === "suspended";
      const path = `/admin/advisors/${id}/${isDeactivated ? "unsuspend" : "suspend"}`;
      await api.patch(path, {});
      toast.success(isDeactivated ? "Advisor reactivated" : "Advisor deactivated");
      setConfirmSuspend(false);
      load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Action failed";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const changeTier = async (tier: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/advisors/${id}`, { tier });
      toast.success(`Tier changed to ${tier}`);
      load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to change tier";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const openChat = async () => {
    if (!u?._id) return;
    setChatLoading(true);
    try {
      const r = await api.post<{ _id: string }>(`/chats/admin/with/${u._id}`, {});
      if (r.data?._id) router.push(`/chats/${r.data._id}`);
      else router.push(`/chats?user=${u._id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not open conversation";
      toast.error(msg);
    } finally {
      setChatLoading(false);
    }
  };

  const u = data?.user;
  const p = data?.profile;
  const m = data?.metrics;

  return (
    <>
      <Topbar />
      <main className="px-6 md:px-8 pb-10">
        <PageHeader
          title="Advisor Profile"
          breadcrumb={[
            { label: "Dashboard", href: "/" },
            { label: "Advisors", href: "/advisors" },
            { label: data?.user.name || "Profile" },
          ]}
          action={
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
          }
        />

        {loading || !data || !u ? (
          <DetailSkeleton />
        ) : (
          <div className="space-y-6">
            {/* ===== Header ===== */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                <div className="relative">
                  <Avatar src={u.profilePhoto} name={u.name} size={96} />
                  <span
                    className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white ${
                      m?.availability.isOnline ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    title={m?.availability.isOnline ? "Online" : "Offline"}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">{u.name}</h2>
                    <StatusBadge status={u.status} />
                    <Badge tone={(["silver", "gold", "platinum"].includes(p?.tier ?? "") ? p!.tier : "silver") as "silver" | "gold" | "platinum"}>
                      {TIER_OPTIONS.find((t) => t.value === (["silver", "gold", "platinum"].includes(p?.tier ?? "") ? p!.tier : "silver"))?.label}
                    </Badge>
                    {m?.availability.availableNow && (
                      <Badge tone="success">Available Now</Badge>
                    )}
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    {p?.professionalTitle || "Professional advisor"}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} />
                      {formatLocation(u.city, countryName(u.country)) || "N/A"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <StarIcon size={14} filled />
                      {p?.avgRating?.toFixed(1) ?? "0.0"} ({p?.ratingsCount ?? 0})
                    </span>
                    <span className="font-mono text-xs text-slate-400">ID: {u._id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Advisor Information ===== */}
            <Section title="Advisor Information">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Full Name" value={u.name} />
                <Field
                  label="Email"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-400" />
                      {u.email}
                    </span>
                  }
                />
                <Field
                  label="Phone"
                  value={
                    u.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400" />
                        {u.phone}
                      </span>
                    ) : (
                      "N/A"
                    )
                  }
                />
                <Field label="Country" value={countryName(u.country) || "N/A"} />
                <Field label="State / Region" value={u.state || "N/A"} />
                <Field label="City" value={u.city || "N/A"} />
                <Field label="Time Zone" value={u.timezone || "N/A"} />
                <Field label="Account Status" value={<StatusBadge status={u.status} />} />
                <Field label="Tier Rank" value={<span className="capitalize">{["silver", "gold", "platinum"].includes(p?.tier ?? "") ? p!.tier : "silver"}</span>} />
                <Field
                  label="Rating"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <StarIcon size={14} filled />
                      {p?.avgRating?.toFixed(1) ?? "0.0"}
                    </span>
                  }
                />
                <Field label="Date Joined" value={formatDate(u.createdAt)} />
                <Field label="Last Login" value={u.lastLoginAt ? formatRelative(u.lastLoginAt) : "N/A"} />
                <Field
                  label="Last Active"
                  value={p?.lastSeenAt ? formatRelative(p.lastSeenAt) : "N/A"}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <TagBlock label="Expertise Areas" items={p?.expertise} tone="info" />
                <TagBlock label="Styles" items={p?.styles} tone="info" />
                <TagBlock label="Languages" items={p?.languages} tone="neutral" />
              </div>

              <div className="mt-6">
                <div className="text-sm font-medium text-slate-500 mb-1.5">Bio / About the Advisor</div>
                <p className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 rounded-xl p-4">
                  {p?.detailedDescription || p?.bio || "No bio provided."}
                </p>
              </div>

              {(p?.audioMessageUrl || p?.introVideoUrl) && (
                <div className="mt-6">
                  <div className="text-sm font-medium text-slate-500 mb-2">Intro Media</div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {p?.audioMessageUrl && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="mb-3 text-sm font-semibold text-slate-700">
                          Audio Message
                        </div>
                        <audio src={p.audioMessageUrl} controls className="w-full" />
                      </div>
                    )}
                    {p?.introVideoUrl && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="mb-3 text-sm font-semibold text-slate-700">
                          Intro Video
                        </div>
                        {isAudioMediaUrl(p.introVideoUrl) ? (
                          <audio src={p.introVideoUrl} controls className="w-full" />
                        ) : (
                          <video
                            src={p.introVideoUrl}
                            controls
                            className="w-full rounded-xl bg-black"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>

            {/* ===== Session Performance ===== */}
            <Section title="Session Performance Metrics">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Stat label="Total Sessions" value={m?.sessions.total ?? 0} />
                <Stat label="Completed" value={m?.sessions.completed ?? 0} />
                <Stat label="Cancelled" value={m?.sessions.cancelled ?? 0} />
                <Stat label="Missed" value={m?.sessions.missed ?? 0} />
                <Stat label="Avg Length" value={`${m?.sessions.avgSessionMinutes ?? 0}m`} />
                <Stat label="Repeat Clients" value={`${m?.sessions.repeatClientRate ?? 0}%`} />
                <Stat label="Retention" value={`${m?.sessions.retentionRate ?? 0}%`} />
              </div>
            </Section>

            {/* ===== Financial Performance ===== */}
            <Section title="Financial Performance">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Stat label="Total Revenue" value={formatCurrency(m?.finance.totalRevenue)} />
                <Stat label="Advisor Earnings" value={formatCurrency(m?.finance.advisorEarnings)} />
                <Stat label="Pending Payouts" value={formatCurrency(m?.finance.pendingPayouts)} />
                <Stat label="Total Paid Out" value={formatCurrency(m?.finance.totalPaidOut)} />
                <Stat label="Refunds" value={formatCurrency(m?.finance.refundAmount)} />
                <Stat label="Chargebacks" value={formatCurrency(m?.finance.chargebackAmount)} />
              </div>
            </Section>

            {/* ===== Advisor-specific Session Pricing ===== */}
            <Section title="Advisor Session Pricing">
              <AdminAdvisorPricing
                advisorId={id}
                profile={p}
                onSaved={load}
              />
            </Section>

            {/* ===== Availability ===== */}
            <Section title="Availability">
              <AdminAvailabilityCalendar
                advisorId={id}
                profile={p}
                metrics={m}
                onSaved={load}
              />
            </Section>

            {/* ===== Action Center ===== */}
            <Section title="Action Center">
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setEditOpen(true)}>
                  <Pencil size={16} /> Edit Profile
                </Button>
                <div className="inline-flex items-center gap-2">
                  <Award size={16} className="text-slate-500" />
                  <select
                    value={["silver", "gold", "platinum"].includes(p?.tier ?? "") ? p!.tier : "silver"}
                    onChange={(e) => changeTier(e.target.value)}
                    disabled={actionLoading}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                  >
                    {TIER_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        Change Tier: {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button variant="outline" onClick={openChat} loading={chatLoading}>
                  <MessageSquare size={16} /> Send Message
                </Button>
                <Button variant="outline" onClick={() => setResetOpen(true)}>
                  <KeyRound size={16} /> Reset Password
                </Button>
                <Button
                  variant={u.status === "deactivated" || u.status === "suspended" ? "primary" : "danger"}
                  onClick={() => setConfirmSuspend(true)}
                >
                  {u.status === "deactivated" || u.status === "suspended" ? "Reactivate Advisor" : "Deactivate Advisor"}
                </Button>
              </div>
            </Section>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={suspendToggle}
        title="Are you sure?"
        description={
          data?.user.status === "deactivated" || data?.user.status === "suspended"
            ? "Re-activate this advisor?"
            : "Deactivate this advisor. They will lose access until you reactivate them."
        }
        confirmText={data?.user.status === "deactivated" || data?.user.status === "suspended" ? "Reactivate" : "Deactivate"}
        danger={data?.user.status !== "deactivated" && data?.user.status !== "suspended"}
        loading={actionLoading}
      />

      {data && u && (
        <EditAdvisorModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          advisorId={id}
          user={u}
          profile={p}
          onSaved={() => {
            setEditOpen(false);
            load();
          }}
        />
      )}

      <ResetPasswordModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        userId={id}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

type CompleteAdvisorPricing = Required<AdvisorPricing>;

const EMPTY_PRICING: CompleteAdvisorPricing = {
  chatPerMin: 0,
  callPerMin: 0,
  videoPerMin: 0,
};

function pricingFormValues(pricing?: AdvisorPricing | null) {
  return {
    chatPerMin: String(Number(pricing?.chatPerMin ?? 0)),
    callPerMin: String(Number(pricing?.callPerMin ?? 0)),
    videoPerMin: String(Number(pricing?.videoPerMin ?? 0)),
  };
}

function AdminAdvisorPricing({
  advisorId,
  profile,
  onSaved,
}: {
  advisorId: string;
  profile?: AdvisorProfile | null;
  onSaved: () => Promise<void> | void;
}) {
  const toast = useToast();
  const effective = profile?.pricing || EMPTY_PRICING;
  const [form, setForm] = useState(() => pricingFormValues(effective));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(pricingFormValues(effective));
  }, [effective.chatPerMin, effective.callPerMin, effective.videoPerMin]);

  const updateField = (key: keyof CompleteAdvisorPricing, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const savePricing = async () => {
    const values: CompleteAdvisorPricing = {
      chatPerMin: Number(form.chatPerMin),
      callPerMin: Number(form.callPerMin),
      videoPerMin: Number(form.videoPerMin),
    };
    if (
      Object.values(form).some((value) => value.trim() === "") ||
      Object.values(values).some((value) => !Number.isFinite(value) || value < 0)
    ) {
      toast.error("Enter a zero or positive number for every session rate");
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/admin/advisors/${advisorId}`, { pricing: values });
      toast.success("Advisor session pricing updated");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update advisor pricing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Set this advisor&apos;s credits-per-minute rates for the website, mobile app, and session bookings.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          label="Chat credits/min"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={form.chatPerMin}
          onChange={(event) => updateField("chatPerMin", event.target.value)}
          disabled={saving}
        />
        <Input
          label="Audio call credits/min"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={form.callPerMin}
          onChange={(event) => updateField("callPerMin", event.target.value)}
          disabled={saving}
        />
        <Input
          label="Video call credits/min"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={form.videoPerMin}
          onChange={(event) => updateField("videoPerMin", event.target.value)}
          disabled={saving}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          onClick={savePricing}
          loading={saving}
          disabled={saving}
        >
          Save Pricing
        </Button>
      </div>
    </div>
  );
}

const CALENDAR_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_NEW_SLOT = { from: "09:00", to: "10:00" };
const SESSION_TYPE_LABELS = [
  { key: "chat", label: "Chat" },
  { key: "call", label: "Call" },
  { key: "video", label: "Video" },
] as const;

type AvailabilityProfile = {
  isOnline: boolean;
  autoOnlineMode: boolean;
  sessionTypes: { chat: boolean; call: boolean; video: boolean };
  weeklySchedule: Record<string, AvailabilityDaySchedule>;
  dateAvailability: Record<string, DateAvailabilityRule>;
};
type AvailabilityDaySchedule = { enabled: boolean; from: string; to: string; slots: RequiredSlot[] };
type RequiredSlot = { from: string; to: string };
type DateAvailabilityRule = { unavailable?: boolean; slots?: RequiredSlot[] };

function AdminAvailabilityCalendar({
  advisorId,
  profile,
  metrics,
  onSaved,
}: {
  advisorId: string;
  profile?: AdvisorProfile | null;
  metrics?: AdvisorMetrics;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState(() => normalizeAvailabilityProfile(profile));
  const [viewMonth, setViewMonth] = useState(() => monthStart(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyDate, setApplyDate] = useState(() => dateKey(new Date()));
  const [applySlotKeys, setApplySlotKeys] = useState<string[]>([]);
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false);
  const [timeOffDate, setTimeOffDate] = useState(() => dateKey(new Date()));
  const [timeOffSlotKeys, setTimeOffSlotKeys] = useState<string[]>([]);
  const [timeOffFullDay, setTimeOffFullDay] = useState(false);

  useEffect(() => {
    setAvailability(normalizeAvailabilityProfile(profile));
  }, [profile?._id, profile?.updatedAt]);

  const dateAvailability = availability.dateAvailability || {};
  const hasDateOverride = (key: string) => Object.prototype.hasOwnProperty.call(dateAvailability, key);
  const getWeeklySlots = (key: string): RequiredSlot[] => {
    const date = parseDateKey(key);
    const weekly = availability.weeklySchedule[WEEKDAY_KEYS[date.getDay()]];
    if (!weekly?.enabled) return [];
    const storedSlots = weekly.slots?.length ? weekly.slots : [];
    const fromToSlot = weekly.from && weekly.to ? [{ from: weekly.from, to: weekly.to }] : [];
    return dedupeSlots(storedSlots.length ? storedSlots : fromToSlot);
  };
  const getDateRule = (key: string): DateAvailabilityRule => {
    if (hasDateOverride(key)) {
      const rule = dateAvailability[key];
      const slots = rule.unavailable ? [] : dedupeSlots(rule.slots || []);
      // Read an override with no windows as a blocked date, matching
      // setDateRule and the API. Also covers rows saved before that rule
      // existed, which would otherwise show the toggle on with no slots.
      return { unavailable: rule.unavailable === true || slots.length === 0, slots };
    }
    return { unavailable: false, slots: getWeeklySlots(key) };
  };
  const getTimeOffBaseSlots = (key: string) => {
    const weeklySlots = getWeeklySlots(key);
    if (weeklySlots.length) return weeklySlots;
    const rule = getDateRule(key);
    return rule.unavailable ? [] : dedupeSlots(rule.slots || []);
  };
  const getTimeOffBlockedKeys = (key: string) => {
    const baseSlots = getTimeOffBaseSlots(key);
    const rule = getDateRule(key);
    if (rule.unavailable) return baseSlots.map(slotKey);
    const available = new Set(dedupeSlots(rule.slots || []).map(slotKey));
    return baseSlots.filter((slot) => !available.has(slotKey(slot))).map(slotKey);
  };
  const isTimeOffSlotEditable = (key: string, slot: RequiredSlot) => {
    const today = dateKey(new Date());
    if (key > today) return true;
    if (key < today) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return toMinutes(slot.from) > currentMinutes;
  };

  const selectedRule = getDateRule(selectedDate);
  const selectedSlots = selectedRule.unavailable ? [] : dedupeSlots(selectedRule.slots || []);
  const selectedApplySlots = selectedSlots.filter((slot) => applySlotKeys.includes(slotKey(slot)));
  const allApplySlotsSelected = selectedSlots.length > 0 && selectedApplySlots.length === selectedSlots.length;
  const selectedWeekdayIndex = parseDateKey(selectedDate).getDay();
  const selectedWeekdayKey = WEEKDAY_KEYS[selectedWeekdayIndex];
  const selectedWeekdayLabel = WEEKDAY_LABELS[selectedWeekdayIndex];
  const selectedWeeklySchedule = availability.weeklySchedule[selectedWeekdayKey];
  const selectedWeeklySlots = getWeeklySlots(selectedDate);
  const selectedHasOverride = hasDateOverride(selectedDate);
  const selectedWeekDates = useMemo(() => {
    const selected = parseDateKey(selectedDate);
    const start = new Date(selected);
    start.setDate(selected.getDate() - selected.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return dateKey(date);
    });
  }, [selectedDate]);
  const todayKey = dateKey(new Date());
  const editableWeekDates = selectedWeekDates.filter((key) => key >= todayKey);
  const fullEditableWeekHasOverrides =
    editableWeekDates.length > 0 && editableWeekDates.every((key) => hasDateOverride(key));
  const selectedSourceLabel = selectedHasOverride
    ? "Date override"
    : selectedWeeklySlots.length
      ? "Weekly recurring"
      : "No weekly schedule";
  const timeOffBaseSlots = getTimeOffBaseSlots(timeOffDate);
  const editableTimeOffSlots = timeOffBaseSlots.filter((slot) => isTimeOffSlotEditable(timeOffDate, slot));
  const allEditableTimeOffSelected =
    timeOffFullDay ||
    (editableTimeOffSlots.length > 0 && editableTimeOffSlots.every((slot) => timeOffSlotKeys.includes(slotKey(slot))));
  const cells = useMemo(() => calendarCells(viewMonth), [viewMonth]);

  const setDateRule = (date: string, rule: DateAvailabilityRule) => {
    const slots = rule.unavailable ? [] : dedupeSlots(rule.slots || []);
    // An override with no windows means nothing is bookable that date, so store
    // it as an explicit block. Left as `{ unavailable: false, slots: [] }` it
    // reads as "no override" and the weekly schedule silently comes back —
    // remove the date entirely (Use weekly) to fall back on purpose.
    const unavailable = rule.unavailable === true || slots.length === 0;
    setAvailability((current) => ({
      ...current,
      dateAvailability: {
        ...current.dateAvailability,
        [date]: { unavailable, slots },
      },
    }));
  };

  const removeDateOverride = (date: string) => {
    setAvailability((current) => {
      const next = { ...current.dateAvailability };
      delete next[date];
      return { ...current, dateAvailability: next };
    });
  };

  const setWeeklySchedule = (day: string, schedule: AdvisorDaySchedule) => {
    const slots = dedupeSlots((schedule.slots || []).map(normalizeSlot).filter((slot): slot is RequiredSlot => !!slot));
    setAvailability((current) => ({
      ...current,
      weeklySchedule: {
        ...current.weeklySchedule,
        [day]: {
          enabled: schedule.enabled === true,
          from: slots[0]?.from || schedule.from || "",
          to: slots[0]?.to || schedule.to || "",
          slots,
        },
      },
    }));
  };

  const setSessionTypeEnabled = (type: "chat" | "call" | "video", enabled: boolean) => {
    setAvailability((current) => ({
      ...current,
      sessionTypes: {
        ...current.sessionTypes,
        [type]: enabled,
      },
    }));
  };

  const setSelectedWeeklyEnabled = (enabled: boolean) => {
    setWeeklySchedule(selectedWeekdayKey, {
      ...selectedWeeklySchedule,
      enabled,
    });
  };

  const addWeeklySlot = () => {
    const current = selectedWeeklySchedule || { enabled: true, from: "", to: "", slots: [] };
    const slots = dedupeSlots([...(current.slots || []), nextSmartSlot(current.slots || [])]);
    setWeeklySchedule(selectedWeekdayKey, {
      ...current,
      enabled: true,
      slots,
    });
  };

  const updateWeeklySlot = (index: number, patch: Partial<RequiredSlot>) => {
    const slots = (selectedWeeklySchedule.slots || []).map((slot, i) => (i === index ? { ...slot, ...patch } : slot));
    if (hasDuplicateSlot(slots)) {
      toast.error("This weekly slot already exists");
      return;
    }
    setWeeklySchedule(selectedWeekdayKey, {
      ...selectedWeeklySchedule,
      enabled: true,
      slots,
    });
  };

  const removeWeeklySlot = (index: number) => {
    const slots = (selectedWeeklySchedule.slots || []).filter((_, i) => i !== index);
    setWeeklySchedule(selectedWeekdayKey, {
      ...selectedWeeklySchedule,
      enabled: slots.length > 0,
      slots,
    });
  };

  const clearDateOverride = () => {
    removeDateOverride(selectedDate);
  };

  const createDateOverride = () => {
    setDateRule(selectedDate, {
      unavailable: false,
      slots: selectedSlots.length ? selectedSlots : selectedWeeklySlots,
    });
  };

  const addSlot = () => {
    setDateRule(selectedDate, {
      unavailable: false,
      slots: [...selectedSlots, nextSmartSlot(selectedSlots)],
    });
  };

  const updateSlot = (index: number, patch: Partial<RequiredSlot>) => {
    const slots = selectedSlots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot));
    if (hasDuplicateSlot(slots)) {
      toast.error("This date slot already exists");
      return;
    }
    setDateRule(selectedDate, { unavailable: false, slots });
  };

  const removeSlot = (index: number) => {
    setDateRule(selectedDate, {
      unavailable: false,
      slots: selectedSlots.filter((_, i) => i !== index),
    });
  };

  const markUnavailable = (unavailable: boolean) => {
    if (unavailable) {
      setDateRule(selectedDate, { unavailable: true, slots: [] });
      return;
    }
    // Switching availability back on has to leave at least one window, or
    // setDateRule would immediately block the date again and the toggle would
    // appear stuck. Fall back to the weekly plan, then to a fresh slot.
    const restored = selectedSlots.length ? selectedSlots : selectedWeeklySlots;
    setDateRule(selectedDate, {
      unavailable: false,
      slots: restored.length ? restored : [nextSmartSlot([])],
    });
  };

  const loadTimeOffDate = (key: string) => {
    const baseSlots = getTimeOffBaseSlots(key);
    const blockedKeys = getTimeOffBlockedKeys(key);
    const rule = getDateRule(key);
    setTimeOffDate(key);
    setTimeOffSlotKeys(blockedKeys);
    setTimeOffFullDay(rule.unavailable || (baseSlots.length > 0 && blockedKeys.length === baseSlots.length));
  };

  const openTimeOffModal = () => {
    loadTimeOffDate(selectedDate);
    setTimeOffModalOpen(true);
  };

  const toggleTimeOffSlot = (slot: RequiredSlot, checked: boolean) => {
    const key = slotKey(slot);
    setTimeOffSlotKeys((current) =>
      checked
        ? Array.from(new Set([...current, key]))
        : current.filter((item) => item !== key),
    );
    if (!checked) setTimeOffFullDay(false);
  };

  const toggleAllTimeOffSlots = (checked: boolean) => {
    const baseSlots = getTimeOffBaseSlots(timeOffDate);
    const editableKeys = baseSlots.filter((slot) => isTimeOffSlotEditable(timeOffDate, slot)).map(slotKey);
    setTimeOffFullDay(checked);
    setTimeOffSlotKeys((current) => {
      const lockedKeys = current.filter((key) => {
        const slot = baseSlots.find((item) => slotKey(item) === key);
        return slot ? !isTimeOffSlotEditable(timeOffDate, slot) : false;
      });
      return checked ? Array.from(new Set([...lockedKeys, ...editableKeys])) : lockedKeys;
    });
  };

  const applyTimeOff = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(timeOffDate)) {
      toast.error("Choose a valid date");
      return;
    }
    if (timeOffDate < todayKey) {
      toast.error("Past dates can no longer be changed");
      return;
    }

    const baseSlots = getTimeOffBaseSlots(timeOffDate);
    if (!baseSlots.length) {
      setDateRule(timeOffDate, { unavailable: true, slots: [] });
      setSelectedDate(timeOffDate);
      setTimeOffModalOpen(false);
      toast.success("Full day time off added. Save changes to keep it.");
      return;
    }

    const currentBlocked = new Set(getTimeOffBlockedKeys(timeOffDate));
    const requestedBlocked = new Set(timeOffSlotKeys);
    const nextBlocked = baseSlots.filter((slot) => {
      const key = slotKey(slot);
      if (!isTimeOffSlotEditable(timeOffDate, slot)) return currentBlocked.has(key);
      return timeOffFullDay || requestedBlocked.has(key);
    });
    const nextBlockedKeys = new Set(nextBlocked.map(slotKey));
    const availableSlots = baseSlots.filter((slot) => !nextBlockedKeys.has(slotKey(slot)));

    if (!nextBlocked.length) {
      removeDateOverride(timeOffDate);
      setSelectedDate(timeOffDate);
      setTimeOffModalOpen(false);
      toast.success("Time off removed. Save changes to keep it.");
      return;
    }

    if (!availableSlots.length) {
      setDateRule(timeOffDate, { unavailable: true, slots: [] });
    } else {
      setDateRule(timeOffDate, { unavailable: false, slots: availableSlots });
    }
    setSelectedDate(timeOffDate);
    setTimeOffModalOpen(false);
    toast.success("Time off updated. Save changes to keep it.");
  };

  const copyToWeek = () => {
    if (!editableWeekDates.length) {
      toast.error("Past weeks can no longer be changed");
      return;
    }
    if (!selectedSlots.length) {
      toast.error("No slots available to copy");
      return;
    }
    setAvailability((current) => {
      const next = { ...current.dateAvailability };
      for (const key of editableWeekDates) {
        next[key] = { unavailable: false, slots: dedupeSlots(selectedSlots) };
      }
      return { ...current, dateAvailability: next };
    });
    toast.success(editableWeekDates.length === 7 ? "Copied to full week" : "Copied to remaining days in this week");
  };

  const removeWeekOverrides = () => {
    if (!editableWeekDates.length) {
      toast.error("Past weeks can no longer be changed");
      return;
    }
    let removed = 0;
    const currentDateAvailability = availability.dateAvailability || {};
    for (const key of editableWeekDates) {
      if (Object.prototype.hasOwnProperty.call(currentDateAvailability, key)) removed += 1;
    }
    if (!removed) {
      toast.error("No week overrides to remove");
      return;
    }
    setAvailability((current) => {
      const next = { ...current.dateAvailability };
      for (const key of editableWeekDates) {
        delete next[key];
      }
      return { ...current, dateAvailability: next };
    });
    toast.success(editableWeekDates.length === 7 ? "Removed week overrides" : "Removed remaining week overrides");
  };

  const toggleWeekOverrides = () => {
    if (fullEditableWeekHasOverrides) {
      removeWeekOverrides();
      return;
    }
    copyToWeek();
  };

  const openApplyModal = () => {
    setApplyDate(selectedDate);
    setApplySlotKeys(selectedSlots.map(slotKey));
    setApplyModalOpen(true);
  };

  const toggleApplySlot = (slot: RequiredSlot, checked: boolean) => {
    const key = slotKey(slot);
    setApplySlotKeys((current) =>
      checked
        ? Array.from(new Set([...current, key]))
        : current.filter((item) => item !== key),
    );
  };

  const toggleAllApplySlots = (checked: boolean) => {
    setApplySlotKeys(checked ? selectedSlots.map(slotKey) : []);
  };

  const applyToAnotherDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(applyDate)) {
      toast.error("Choose a valid date");
      return;
    }
    if (!selectedApplySlots.length) {
      toast.error("Choose at least one slot to copy");
      return;
    }
    setDateRule(applyDate, { unavailable: false, slots: dedupeSlots(selectedApplySlots) });
    setApplyModalOpen(false);
    toast.success("Date override created");
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/advisors/${advisorId}`, {
        isOnline: availability.isOnline,
        autoOnlineMode: availability.autoOnlineMode,
        sessionTypes: availability.sessionTypes,
        weeklySchedule: availability.weeklySchedule,
        dateAvailability: availability.dateAvailability,
      });
      toast.success("Advisor availability updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save availability");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <StatusPill active={availability.isOnline} label={availability.isOnline ? "Online" : "Offline"} />
          <StatusPill active={!!metrics?.availability.availableNow} icon={<Clock size={15} />} label={metrics?.availability.availableNow ? "Available Now" : "Not Available Now"} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={availability.isOnline}
              onChange={(event) => setAvailability((current) => ({ ...current, isOnline: event.target.checked }))}
              className="h-4 w-4 accent-[#0a7a90]"
            />
            Online
          </label>
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={availability.autoOnlineMode}
              onChange={(event) => setAvailability((current) => ({ ...current, autoOnlineMode: event.target.checked }))}
              className="h-4 w-4 accent-[#0a7a90]"
            />
            Auto schedule
          </label>
          <Button type="button" onClick={openTimeOffModal}>
            <Plus size={15} />
            Add Time Off
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <IconButton label="Previous month" onClick={() => setViewMonth(addMonths(viewMonth, -1))}>
                <ChevronLeft size={16} />
              </IconButton>
              <div className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-800">
                <CalendarDays size={16} className="text-[#0a7a90]" />
                {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <IconButton label="Next month" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
                <ChevronRight size={16} />
              </IconButton>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewMonth(monthStart(now));
                  setSelectedDate(dateKey(now));
                }}
                className="h-8 rounded-md px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(monthStart(parseDateKey(selectedDate)))}
                className="h-8 rounded-md bg-[#e6f2f6] px-3 text-sm font-bold text-[#0a7a90]"
              >
                Month
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-[11px] font-bold text-slate-500">
            {CALENDAR_DAYS.map((day) => (
              <div key={day} className="py-3">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell) => {
              const key = dateKey(cell);
              const rule = getDateRule(key);
              const overridden = hasDateOverride(key);
              const count = rule.unavailable ? 0 : rule.slots?.length || 0;
              const unavailable = rule.unavailable === true;
              const inMonth = cell.getMonth() === viewMonth.getMonth();
              const selected = key === selectedDate;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-28 border-b border-r border-slate-100 p-2 text-left transition ${
                    selected
                      ? "bg-[#e6f2f6] ring-2 ring-inset ring-[#0a7a90]"
                      : unavailable
                        ? "bg-red-50/60"
                        : count
                          ? "bg-emerald-50/60 hover:bg-emerald-50"
                          : "bg-white hover:bg-slate-50"
                  } ${inMonth ? "" : "opacity-45"}`}
                >
                  <span className="text-sm font-semibold text-slate-700">{cell.getDate()}</span>
                  <div className="mt-3 min-h-8 space-y-1">
                    {unavailable ? <StatusLine tone="red" label="Unavailable" /> : count ? <StatusLine tone="green" label={`${count} Slot${count === 1 ? "" : "s"}`} /> : null}
                    {overridden ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Override
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-5 px-4 py-3 text-xs font-semibold text-slate-500">
            <Legend color="bg-emerald-400" label="Available" />
            <Legend color="bg-amber-400" label="Override" />
            <Legend color="bg-red-300" label="Unavailable" />
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{formatDateLabel(selectedDate)}</h2>
              <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                selectedHasOverride
                  ? "bg-amber-50 text-amber-700"
                  : selectedWeeklySlots.length
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
              }`}>
                {selectedSourceLabel}
              </div>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-600" aria-label="Close details">
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Weekly recurring schedule</h3>
                <p className="mt-0.5 text-xs text-slate-500">Changes here repeat every {selectedWeekdayLabel}.</p>
              </div>
              <ToggleSwitch checked={!!selectedWeeklySchedule?.enabled} onChange={setSelectedWeeklyEnabled} />
            </div>

            <div className="mt-3 space-y-3">
              {!selectedWeeklySchedule?.enabled ? (
                <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No recurring slots for {selectedWeekdayLabel}.</div>
              ) : selectedWeeklySchedule.slots?.length ? (
                selectedWeeklySchedule.slots.map((slot, index) => (
                  <TimeSlotRow
                    key={`${selectedWeekdayKey}-${index}`}
                    slot={slot}
                    onChange={(patch) => updateWeeklySlot(index, patch)}
                    onRemove={() => removeWeeklySlot(index)}
                  />
                ))
              ) : (
                <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">Turned on, but no slots added yet.</div>
              )}

              <button type="button" onClick={addWeeklySlot} className="inline-flex h-9 items-center gap-2 text-sm font-bold text-[#0a7a90]">
                <Plus size={15} />
                Add Weekly Slot
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Session types</h3>
              <p className="mt-0.5 text-xs text-slate-500">Choose which session modes clients can book.</p>
            </div>
            <div className="mt-3 space-y-2">
              {SESSION_TYPE_LABELS.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm font-bold text-slate-800">{item.label}</span>
                  <ToggleSwitch
                    checked={availability.sessionTypes[item.key] !== false}
                    onChange={(enabled) => setSessionTypeEnabled(item.key, enabled)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-900">Date actions</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton icon={<CalendarDays size={15} />} label="Apply to Another Date" onClick={openApplyModal} />
              <ActionButton
                icon={fullEditableWeekHasOverrides ? <Trash2 size={15} /> : <Copy size={15} />}
                label={fullEditableWeekHasOverrides ? "Remove Week" : "Copy to Week"}
                danger={fullEditableWeekHasOverrides}
                onClick={toggleWeekOverrides}
              />
              <ActionButton icon={<X size={15} />} label="Manage Time Off" danger onClick={openTimeOffModal} />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Date override</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedHasOverride ? "Changes here apply only to this date." : "This date is using the weekly recurring schedule."}
                </p>
              </div>
              {selectedHasOverride ? (
                <button type="button" onClick={clearDateOverride} className="shrink-0 text-xs font-bold text-[#0a7a90] hover:underline">Use weekly</button>
              ) : (
                <button type="button" onClick={createDateOverride} className="shrink-0 text-xs font-bold text-[#0a7a90] hover:underline">Override</button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div>
                <span className="text-sm font-bold text-slate-900">Available on this date</span>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedRule.unavailable ? "This date is blocked." : "Clients can book the slots below."}
                </p>
              </div>
              <ToggleSwitch checked={!selectedRule.unavailable} onChange={(next) => markUnavailable(!next)} />
            </div>

            <div className="mt-3 space-y-3">
              {selectedRule.unavailable ? (
                <div className="rounded-lg bg-slate-100 px-3 py-4 text-sm font-semibold text-slate-500">This day is marked unavailable.</div>
              ) : selectedSlots.length ? (
                selectedSlots.map((slot, index) => (
                  <TimeSlotRow
                    key={`${selectedDate}-${index}`}
                    slot={slot}
                    onChange={(patch) => updateSlot(index, patch)}
                    onRemove={() => removeSlot(index)}
                  />
                ))
              ) : (
                <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No slots for this date.</div>
              )}
              <button type="button" onClick={addSlot} disabled={selectedRule.unavailable} className="inline-flex h-9 items-center gap-2 text-sm font-bold text-[#0a7a90] disabled:text-slate-400">
                <Plus size={15} />
                Add Date Slot
              </button>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-5 bg-white px-4 pb-1 pt-3">
            <Button onClick={save} loading={saving} className="w-full">Save Changes</Button>
          </div>
        </aside>
      </div>

      {timeOffModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add time off</h2>
                <p className="mt-1 text-sm text-slate-500">Select the slots clients cannot book.</p>
              </div>
              <button type="button" onClick={() => setTimeOffModalOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close time off modal">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-600">
              <div><span className="text-emerald-700">Can change:</span> future dates and slots that have not started yet.</div>
              <div><span className="text-red-600">Cannot change:</span> past dates or slots that already started.</div>
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Date</span>
              <input
                type="date"
                value={timeOffDate}
                min={todayKey}
                onChange={(event) => loadTimeOffDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20"
              />
            </label>

            {timeOffDate < todayKey ? (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-3 text-sm font-semibold text-red-600">
                Past dates can no longer be changed.
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Time off slots</div>
                  <div className="text-xs text-slate-500">Checked slots will be blocked.</div>
                </div>
                {timeOffBaseSlots.length ? (
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0a7a90]">
                    <input
                      type="checkbox"
                      checked={allEditableTimeOffSelected}
                      onChange={(event) => toggleAllTimeOffSlots(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#0a7a90]"
                    />
                    All
                  </label>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {timeOffBaseSlots.length ? (
                  timeOffBaseSlots.map((slot, index) => {
                    const editable = isTimeOffSlotEditable(timeOffDate, slot);
                    const checked = editable
                      ? timeOffFullDay || timeOffSlotKeys.includes(slotKey(slot))
                      : timeOffSlotKeys.includes(slotKey(slot));
                    return (
                      <label
                        key={`${timeOffDate}-time-off-${index}`}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${
                          editable ? "bg-slate-50 text-slate-800" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!editable}
                          onChange={(event) => toggleTimeOffSlot(slot, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-[#0a7a90] disabled:opacity-50"
                        />
                        <span className="flex-1">{slot.from} - {slot.to}</span>
                        {!editable ? (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">Started</span>
                        ) : null}
                      </label>
                    );
                  })
                ) : (
                  <div className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    No slots on this date. Applying time off will block the full day.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setTimeOffModalOpen(false)}>Cancel</Button>
              <Button type="button" onClick={applyTimeOff} disabled={timeOffDate < todayKey}>Apply Time Off</Button>
            </div>
          </div>
        </div>
      ) : null}

      {applyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Apply to another date</h2>
                <p className="mt-1 text-sm text-slate-500">This creates a date override using the selected slots.</p>
              </div>
              <button type="button" onClick={() => setApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close apply date modal">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Slots to copy</div>
                {selectedSlots.length ? (
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0a7a90]">
                    <input
                      type="checkbox"
                      checked={allApplySlotsSelected}
                      onChange={(event) => toggleAllApplySlots(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0a7a90] accent-[#0a7a90]"
                    />
                    All
                  </label>
                ) : null}
              </div>
              <div className="mt-2 space-y-2">
                {selectedSlots.length ? selectedSlots.map((slot, index) => (
                  <label key={`${selectedDate}-copy-${index}`} className="flex items-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={applySlotKeys.includes(slotKey(slot))}
                      onChange={(event) => toggleApplySlot(slot, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0a7a90] accent-[#0a7a90]"
                    />
                    <span>{slot.from} - {slot.to}</span>
                  </label>
                )) : (
                  <div className="text-sm text-slate-500">No slots selected.</div>
                )}
              </div>
              {selectedSlots.length ? (
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  {selectedApplySlots.length} of {selectedSlots.length} selected
                </div>
              ) : null}
            </div>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Target date</span>
              <input
                type="date"
                value={applyDate}
                onChange={(event) => setApplyDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setApplyModalOpen(false)}>Cancel</Button>
              <Button type="button" onClick={applyToAnotherDate} disabled={selectedApplySlots.length === 0}>Apply Override</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-bold text-slate-900">{value}</div>
    </div>
  );
}

function normalizeAvailabilityProfile(profile?: AdvisorProfile | null): AvailabilityProfile {
  return {
    isOnline: !!profile?.isOnline,
    autoOnlineMode: !!profile?.autoOnlineMode,
    sessionTypes: {
      chat: profile?.sessionTypes?.chat !== false,
      call: profile?.sessionTypes?.call !== false,
      video: profile?.sessionTypes?.video !== false,
    },
    weeklySchedule: Object.fromEntries(
      WEEKDAY_KEYS.map((day) => [day, normalizeDaySchedule(profile?.weeklySchedule?.[day])]),
    ) as AvailabilityProfile["weeklySchedule"],
    dateAvailability: normalizeDateAvailability(profile?.dateAvailability),
  };
}

function normalizeSlot(slot?: Partial<AdvisorScheduleSlot> | null): RequiredSlot | null {
  const from = String(slot?.from || "").trim();
  const to = String(slot?.to || "").trim();
  if (!from || !to) return null;
  return { from, to };
}

function normalizeDaySchedule(schedule?: Partial<AdvisorDaySchedule>): AvailabilityDaySchedule {
  const cleanSlots = (Array.isArray(schedule?.slots) ? schedule.slots : [])
    .map(normalizeSlot)
    .filter((slot): slot is RequiredSlot => !!slot);
  const uniqueSlots = dedupeSlots(cleanSlots);
  const fallbackSlot = normalizeSlot({ from: schedule?.from, to: schedule?.to });
  const slots = uniqueSlots.length ? uniqueSlots : fallbackSlot ? [fallbackSlot] : [];
  return {
    enabled: schedule?.enabled === true,
    from: slots[0]?.from || String(schedule?.from || "09:00"),
    to: slots[0]?.to || String(schedule?.to || "18:00"),
    slots,
  };
}

function normalizeDateAvailability(value?: Record<string, AdvisorDateAvailability>) {
  const normalized: Record<string, DateAvailabilityRule> = {};
  for (const [date, schedule] of Object.entries(value || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const slots = (schedule.slots || [])
      .map(normalizeSlot)
      .filter((slot): slot is RequiredSlot => !!slot);
    normalized[date] = {
      unavailable: schedule.unavailable === true,
      slots: schedule.unavailable === true ? [] : dedupeSlots(slots),
    };
  }
  return normalized;
}

function slotKey(slot: RequiredSlot) {
  return `${slot.from}-${slot.to}`;
}

function dedupeSlots(slots: RequiredSlot[]) {
  const seen = new Set<string>();
  const unique: RequiredSlot[] = [];
  for (const slot of slots) {
    const key = slotKey(slot);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(slot);
  }
  return unique;
}

function hasDuplicateSlot(slots: RequiredSlot[]) {
  return dedupeSlots(slots).length !== slots.length;
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function toTime(minutes: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function nextSmartSlot(existingSlots: RequiredSlot[]) {
  const existing = dedupeSlots(existingSlots);
  if (!existing.length) return DEFAULT_NEW_SLOT;
  let start = Math.max(...existing.map((slot) => toMinutes(slot.to)));
  let end = Math.min(start + 60, 23 * 60 + 59);
  if (end <= start) {
    start = 8 * 60;
    end = 9 * 60;
  }
  let next = { from: toTime(start), to: toTime(end) };
  const taken = new Set(existing.map(slotKey));
  while (taken.has(slotKey(next)) && end < 23 * 60 + 59) {
    start += 60;
    end = Math.min(start + 60, 23 * 60 + 59);
    next = { from: toTime(start), to: toTime(end) };
  }
  return next;
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

function TimeSlotRow({
  slot,
  onChange,
  onRemove,
}: {
  slot: RequiredSlot;
  onChange: (patch: Partial<RequiredSlot>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
      <Clock size={16} className="shrink-0 text-slate-400" />
      <TimeInput value={slot.from} onChange={(value) => onChange({ from: value })} />
      <span className="text-xs font-semibold text-slate-400">-</span>
      <TimeInput value={slot.to} onChange={(value) => onChange({ to: value })} />
      <button type="button" onClick={onRemove} className="ml-auto text-slate-400 hover:text-red-600" aria-label="Remove time slot">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 min-w-0 flex-1 rounded-md border-0 bg-transparent p-0 text-sm font-semibold text-slate-700 outline-none"
    />
  );
}

function ActionButton({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold ${
        danger
          ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className={danger ? "text-red-500" : "text-[#0a7a90]"}>{icon}</span>
      {label}
    </button>
  );
}

function StatusPill({ active, label, icon }: { active: boolean; label: string; icon?: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
      {icon || <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />}
      {label}
    </span>
  );
}

function StatusLine({ tone, label }: { tone: "green" | "red"; label: string }) {
  const dot = tone === "green" ? "bg-emerald-500" : "bg-red-500";
  const text = tone === "green" ? "text-emerald-700" : "text-red-600";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarCells(month: Date) {
  const first = monthStart(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(key: string) {
  return parseDateKey(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function TagBlock({
  label,
  items,
  tone,
}: {
  label: string;
  items?: string[];
  tone: "info" | "neutral";
}) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-500 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items && items.length > 0 ? (
          items.map((s) => (
            <Badge key={s} tone={tone}>
              {s}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-slate-400">N/A</span>
        )}
      </div>
    </div>
  );
}

function MultiSelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const toggle = (next: string) => {
    const set = new Set(selected);
    if (set.has(next)) set.delete(next);
    else set.add(next);
    onChange(Array.from(set).join(", "));
  };

  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-slate-700">{label}</div>
      <div className="rounded-lg border border-transparent bg-[#e6f2f6]/60 p-2">
        <div className="mb-2 flex min-h-6 flex-wrap gap-1">
          {selected.length ? (
            selected.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {item}
              </span>
            ))
          ) : (
            <span className="px-1 text-sm text-slate-500">Select {label.toLowerCase()}</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-white"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="h-4 w-4 accent-[#0a7a90]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({
  open,
  onClose,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
}) {
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pw.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/admin/users/${userId}/reset-password`, { newPassword: pw });
      toast.success("Password reset. Advisor must set a new one on next login.");
      setPw("");
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reset Advisor Password" size="md">
      <div className="space-y-4">
        <Input
          label="New Password"
          type="text"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Enter a new password"
        />
        <p className="text-xs text-slate-500">
          The advisor will be required to set their own password the next time they log in.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={loading}>
            Reset Password
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type WeeklyScheduleForm = Record<
  string,
  { enabled: boolean; from: string; to: string; slots: Array<{ from: string; to: string }> }
>;

const defaultWeeklySchedule = (profile?: AdvisorProfile | null): WeeklyScheduleForm =>
  Object.fromEntries(
    DAY_ORDER.map((day) => {
      const current = profile?.weeklySchedule?.[day];
      const slots = current?.slots?.length
        ? current.slots.map((slot) => ({
            from: slot.from || "09:00",
            to: slot.to || "18:00",
          }))
        : [{ from: current?.from || "09:00", to: current?.to || "18:00" }];
      return [
        day,
        {
          enabled: current?.enabled === true,
          from: slots[0]?.from || "09:00",
          to: slots[0]?.to || "18:00",
          slots,
        },
      ];
    }),
  ) as WeeklyScheduleForm;

function EditAdvisorModal({
  open,
  onClose,
  advisorId,
  user,
  profile,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  advisorId: string;
  user: AdminUser;
  profile?: AdvisorProfile | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const countries = useCountries();
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const buildInitialForm = () => ({
    name: user.name || "",
    phoneNumber: user.phone || "",
    country: user.country || "",
    state: user.state || "",
    city: user.city || "",
    timezone: user.timezone || "",
    professionalTitle: profile?.professionalTitle || "",
    tier: ["silver", "gold", "platinum"].includes(profile?.tier ?? "") ? (profile!.tier as string) : "silver",
    expertise: (profile?.expertise || []).join(", "),
    styles: (profile?.styles || []).join(", "),
    languages: (profile?.languages || []).join(", "),
    bio: profile?.bio || "",
    detailedDescription: profile?.detailedDescription || "",
    isOnline: !!profile?.isOnline,
    autoOnlineMode: !!profile?.autoOnlineMode,
    weeklySchedule: defaultWeeklySchedule(profile),
  });
  const [form, setForm] = useState(buildInitialForm);
  const cities = useCities(form.country);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm(buildInitialForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user._id, profile?._id]);

  const onChange = (k: keyof typeof form, v: string | boolean | WeeklyScheduleForm) =>
    setForm((s) => ({ ...s, [k]: v }));
  const updateDay = (
    day: string,
    patch: Partial<WeeklyScheduleForm[string]>,
  ) => {
    setForm((s) => ({
      ...s,
      weeklySchedule: {
        ...s.weeklySchedule,
        [day]: {
          ...s.weeklySchedule[day],
          ...patch,
        },
      },
    }));
  };

  const submit = async () => {
    setLoading(true);
    try {
      await api.patch(`/admin/advisors/${advisorId}`, {
        name: form.name,
        phoneNumber: form.phoneNumber,
        country: form.country,
        state: form.state,
        city: form.city,
        timezone: form.timezone,
        professionalTitle: form.professionalTitle,
        tier: form.tier,
        expertise: form.expertise,
        styles: form.styles,
        languages: form.languages,
        bio: form.bio,
        detailedDescription: form.detailedDescription,
        isOnline: form.isOnline,
        autoOnlineMode: form.autoOnlineMode,
        weeklySchedule: form.weeklySchedule,
      });
      toast.success("Advisor updated");
      onSaved();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Advisor Profile" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Full Name" value={form.name} onChange={(e) => onChange("name", e.target.value)} />
        <Input
          label="Phone Number"
          value={form.phoneNumber}
          onChange={(e) => onChange("phoneNumber", e.target.value)}
        />
        <label className="block">
          <span className="block mb-1.5 text-sm font-medium text-slate-700">Country</span>
          <Combobox
            options={countries.map((c) => ({ value: c.iso2, label: c.name }))}
            value={form.country}
            onChange={(v) => setForm((s) => ({ ...s, country: v, city: "" }))}
            placeholder="Select country..."
            searchPlaceholder="Search countries..."
            emptyText="No country found."
          />
        </label>
        <Input
          label="State / Region"
          value={form.state}
          onChange={(e) => onChange("state", e.target.value)}
        />
        <label className="block">
          <span className="block mb-1.5 text-sm font-medium text-slate-700">City</span>
          <Combobox
            options={cities.map((c) => ({ value: c, label: c }))}
            value={form.city}
            onChange={(v) => onChange("city", v)}
            placeholder={form.country ? "Select city..." : "Select a country first"}
            searchPlaceholder="Search cities..."
            emptyText="No city found."
            disabled={!form.country}
            allowCustom
          />
        </label>
        <label className="block">
          <span className="block mb-1.5 text-sm font-medium text-slate-700">Time Zone</span>
          <Combobox
            options={timezoneOptions}
            value={form.timezone}
            onChange={(v) => onChange("timezone", v)}
            placeholder="Select timezone..."
            searchPlaceholder="Search timezones..."
            emptyText="No timezone found."
          />
        </label>
        <Input
          label="Professional Title"
          value={form.professionalTitle}
          onChange={(e) => onChange("professionalTitle", e.target.value)}
        />
        <label className="block">
          <span className="block mb-1.5 text-sm font-medium text-slate-700">Tier Rank</span>
          <Combobox
            options={TIER_OPTIONS}
            value={form.tier}
            onChange={(v) => onChange("tier", v)}
            placeholder="Select tier..."
            searchPlaceholder="Search tiers..."
            emptyText="No tier found."
          />
        </label>
        <MultiSelectField
          label="Expertise Areas"
          options={ADVISOR_EXPERTISE_OPTIONS}
          value={form.expertise}
          onChange={(v) => onChange("expertise", v)}
        />
        <MultiSelectField
          label="Styles"
          options={ADVISOR_STYLE_OPTIONS}
          value={form.styles}
          onChange={(v) => onChange("styles", v)}
        />
        <Input
          label="Languages"
          value={form.languages}
          onChange={(e) => onChange("languages", e.target.value)}
          placeholder="Comma separated"
        />
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-700 mb-2">Availability</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <label className="block">
            <span className="block mb-1.5 text-sm font-medium text-slate-700">Current Online Status</span>
            <Combobox
              options={[
                { value: "online", label: "Online" },
                { value: "offline", label: "Offline" },
                { value: "busy", label: "Busy" },
                { value: "away", label: "Away" },
              ]}
              value={form.isOnline ? "online" : "offline"}
              onChange={(v) => onChange("isOnline", v === "online")}
              placeholder="Select status..."
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mt-6 md:mt-0">
            <span>
              <span className="block text-sm font-medium text-slate-700">Auto Online Mode</span>
              <span className="block text-xs text-slate-500">Use weekly schedule to go online automatically</span>
            </span>
            <input
              type="checkbox"
              checked={form.autoOnlineMode}
              onChange={(e) => onChange("autoOnlineMode", e.target.checked)}
              className="h-5 w-5 accent-[#0a7a90]"
            />
          </label>
        </div>
        <div className="space-y-2">
          {DAY_ORDER.map((day) => {
            const current = form.weeklySchedule[day];
            return (
              <div
                key={day}
                className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
              >
                <label className="flex items-center gap-2 text-sm font-medium capitalize text-slate-700">
                  <input
                    type="checkbox"
                    checked={current.enabled}
                    onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-[#0a7a90]"
                  />
                  {day}
                </label>
                <Input
                  label="Start"
                  type="time"
                  value={current.from}
                  onChange={(e) =>
                    updateDay(day, {
                      from: e.target.value,
                      slots: [{ from: e.target.value, to: current.to }],
                    })
                  }
                />
                <Input
                  label="End"
                  type="time"
                  value={current.to}
                  onChange={(e) =>
                    updateDay(day, {
                      to: e.target.value,
                      slots: [{ from: current.from, to: e.target.value }],
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <Textarea
          label="Bio / About the Advisor"
          value={form.detailedDescription}
          onChange={(e) => onChange("detailedDescription", e.target.value)}
          placeholder="Detailed description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} loading={loading}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}
