"use client";

import { useEffect, useMemo, useState } from "react";
import { Topbar } from "../../components/Topbar";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";

type CreditPack = {
  id: string;
  label: string;
  credits: number;
  bonusCredits?: number;
  totalCredits?: number;
  priceUsd: number;
  revenueCatProductId?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type CreditUsageBlock = {
  id: string;
  activity: string;
  sessionType: "chat" | "call" | "video" | "add_on";
  durationMinutes: number;
  credits: number;
  isActive?: boolean;
  sortOrder?: number;
};

type CreditSettings = {
  signupFreeCredits: number;
  creditExpirationDays: number;
  creditUsdRate: number;
  creditPacks: CreditPack[];
  creditUsage: {
    chatTranscript: number;
    videoRecording: number;
    audioRecording: number;
    sessionRecording: number;
  };
  creditUsageBlocks: CreditUsageBlock[];
};

type CreditSummary = {
  settings: {
    packs: CreditPack[];
    usageBlocks: CreditUsageBlock[];
    creditExpirationDays: number;
  };
  totals: {
    purchasedBalance: number;
    freeBalance: number;
    creditsSpent: number;
    creditSalesRevenue: number;
    creditPurchaseCount: number;
    creditsSold: number;
    expiredCredits: number;
    expiredCount: number;
  };
  usageByType: Record<string, { credits: number; count: number }>;
};

const DEFAULT_PACKS: CreditPack[] = [
  { id: "credits_25", label: "25 Credits", credits: 25, bonusCredits: 0, priceUsd: 19, revenueCatProductId: "credits_25", isActive: true, sortOrder: 1 },
  { id: "credits_50", label: "50 Credits", credits: 50, bonusCredits: 0, priceUsd: 35, revenueCatProductId: "credits_50", isActive: true, sortOrder: 2 },
  { id: "credits_100", label: "100 Credits", credits: 100, bonusCredits: 0, priceUsd: 59, revenueCatProductId: "credits_100", isActive: true, sortOrder: 3 },
  { id: "credits_200", label: "200 Credits", credits: 200, bonusCredits: 0, priceUsd: 99, revenueCatProductId: "credits_200", isActive: true, sortOrder: 4 },
];

const DEFAULT_USAGE_BLOCKS: CreditUsageBlock[] = [
  { id: "chat_15", activity: "15-Minute Chat Session", sessionType: "chat", durationMinutes: 15, credits: 5, isActive: true, sortOrder: 1 },
  { id: "voice_5", activity: "5-Minute Voice Call", sessionType: "call", durationMinutes: 5, credits: 8, isActive: true, sortOrder: 2 },
  { id: "voice_10", activity: "10-Minute Voice Call", sessionType: "call", durationMinutes: 10, credits: 10, isActive: true, sortOrder: 3 },
  { id: "voice_15", activity: "15-Minute Voice Call", sessionType: "call", durationMinutes: 15, credits: 15, isActive: true, sortOrder: 4 },
  { id: "video_5", activity: "5-Minute Video Call", sessionType: "video", durationMinutes: 5, credits: 10, isActive: true, sortOrder: 5 },
  { id: "video_10", activity: "10-Minute Video Call", sessionType: "video", durationMinutes: 10, credits: 15, isActive: true, sortOrder: 6 },
  { id: "video_15", activity: "15-Minute Video Call", sessionType: "video", durationMinutes: 15, credits: 20, isActive: true, sortOrder: 7 },
  { id: "video_recording", activity: "Video Recording Unlock", sessionType: "add_on", durationMinutes: 0, credits: 5, isActive: true, sortOrder: 8 },
  { id: "audio_recording", activity: "Audio Recording Unlock", sessionType: "add_on", durationMinutes: 0, credits: 5, isActive: true, sortOrder: 9 },
  { id: "chat_transcript", activity: "Chat PDF Transcript Unlock", sessionType: "add_on", durationMinutes: 0, credits: 5, isActive: true, sortOrder: 10 },
];

export default function CreditManagementPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<CreditSettings | null>(null);
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [settingsRes, summaryRes] = await Promise.all([
        api.get<CreditSettings>("/admin/settings/credits"),
        api.get<CreditSummary>("/admin/credits/summary"),
      ]);
      setSettings(withDefaults(settingsRes.data));
      setSummary(summaryRes.data || null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load credit management";
      toast.error(msg);
      setSettings(withDefaults(null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!settings) return;
    const error = validate(settings);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch<CreditSettings>("/admin/settings/credits", {
        signupFreeCredits: settings.signupFreeCredits,
        creditExpirationDays: settings.creditExpirationDays,
        creditUsdRate: settings.creditUsdRate,
        creditPacks: settings.creditPacks,
        creditUsageBlocks: settings.creditUsageBlocks,
      });
      setSettings(withDefaults(res.data));
      toast.success("Credit management updated");
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save credit management";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const activePacks = useMemo(
    () => settings?.creditPacks.filter((pack) => pack.isActive !== false).length || 0,
    [settings?.creditPacks],
  );

  return (
    <>
      <Topbar />
      <main className="px-6 md:px-8 pb-10">
        <PageHeader
          title="Credit Management"
          breadcrumb={[{ label: "Dashboard", href: "/" }, { label: "Credit Management" }]}
          action={<Button onClick={save} loading={saving} disabled={loading}>Save Changes</Button>}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <Stat label="Credit sales" value={`$${num(summary?.totals.creditSalesRevenue).toLocaleString()}`} />
          <Stat label="Credits sold" value={num(summary?.totals.creditsSold).toLocaleString()} />
          <Stat label="Outstanding credits" value={num((summary?.totals.purchasedBalance || 0) + (summary?.totals.freeBalance || 0)).toLocaleString()} />
          <Stat label="Active packs" value={String(activePacks)} />
        </div>

        {loading || !settings ? (
          <div className="h-96 rounded-xl bg-white border border-slate-100 animate-pulse" />
        ) : (
          <div className="space-y-6">
            <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Signup free credits"
                  type="number"
                  min={0}
                  value={String(settings.signupFreeCredits)}
                  onChange={(e) => setSettings({ ...settings, signupFreeCredits: Number(e.target.value) })}
                />
                <Input
                  label="Credit expiration days"
                  type="number"
                  min={1}
                  value={String(settings.creditExpirationDays)}
                  onChange={(e) => setSettings({ ...settings, creditExpirationDays: Number(e.target.value) })}
                />
                <Input
                  label="Custom purchase USD per credit"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={String(settings.creditUsdRate)}
                  onChange={(e) => setSettings({ ...settings, creditUsdRate: Number(e.target.value) })}
                />
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Credit Packs</h2>
                  <p className="text-sm text-slate-500">Create, edit, activate, deactivate, delete, and configure bonus credit promotions.</p>
                </div>
                <Button variant="outline" onClick={() => setSettings({ ...settings, creditPacks: [...settings.creditPacks, newPack(settings.creditPacks.length)] })}>
                  Add Pack
                </Button>
              </div>
              <div className="space-y-3">
                {settings.creditPacks.map((pack, index) => (
                  <div key={`${pack.id}-${index}`} className="grid grid-cols-1 lg:grid-cols-8 gap-3 rounded-lg border border-slate-100 p-3">
                    <Input label="ID" value={pack.id} onChange={(e) => patchPack(settings, setSettings, index, { id: e.target.value })} />
                    <Input label="Label" value={pack.label} onChange={(e) => patchPack(settings, setSettings, index, { label: e.target.value })} />
                    <Input label="Credits" type="number" min={1} value={String(pack.credits)} onChange={(e) => patchPack(settings, setSettings, index, { credits: Number(e.target.value) })} />
                    <Input label="Bonus" type="number" min={0} value={String(pack.bonusCredits || 0)} onChange={(e) => patchPack(settings, setSettings, index, { bonusCredits: Number(e.target.value) })} />
                    <Input label="USD price" type="number" min={0} step={0.01} value={String(pack.priceUsd)} onChange={(e) => patchPack(settings, setSettings, index, { priceUsd: Number(e.target.value) })} />
                    <Input label="RevenueCat product" value={pack.revenueCatProductId || ""} onChange={(e) => patchPack(settings, setSettings, index, { revenueCatProductId: e.target.value })} />
                    <label className="flex items-end gap-2 text-sm text-slate-700 pb-2">
                      <input type="checkbox" checked={pack.isActive !== false} onChange={(e) => patchPack(settings, setSettings, index, { isActive: e.target.checked })} />
                      Active
                    </label>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={() => setSettings({ ...settings, creditPacks: settings.creditPacks.filter((_, i) => i !== index) })}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Credit Usage Blocks</h2>
                  <p className="text-sm text-slate-500">Control the public usage guide for chat, voice, video, recordings, and transcripts.</p>
                </div>
                <Button variant="outline" onClick={() => setSettings({ ...settings, creditUsageBlocks: [...settings.creditUsageBlocks, newUsageBlock(settings.creditUsageBlocks.length)] })}>
                  Add Usage
                </Button>
              </div>
              <div className="space-y-3">
                {settings.creditUsageBlocks.map((block, index) => (
                  <div key={`${block.id}-${index}`} className="grid grid-cols-1 lg:grid-cols-7 gap-3 rounded-lg border border-slate-100 p-3">
                    <Input label="ID" value={block.id} onChange={(e) => patchBlock(settings, setSettings, index, { id: e.target.value })} />
                    <Input label="Activity" value={block.activity} onChange={(e) => patchBlock(settings, setSettings, index, { activity: e.target.value })} />
                    <label className="text-sm text-slate-700">
                      <span className="block text-xs text-slate-500 mb-1">Type</span>
                      <select
                        className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm"
                        value={block.sessionType}
                        onChange={(e) => patchBlock(settings, setSettings, index, { sessionType: e.target.value as CreditUsageBlock["sessionType"] })}
                      >
                        <option value="chat">Chat</option>
                        <option value="call">Voice</option>
                        <option value="video">Video</option>
                        <option value="add_on">Add-on</option>
                      </select>
                    </label>
                    <Input label="Minutes" type="number" min={0} value={String(block.durationMinutes)} onChange={(e) => patchBlock(settings, setSettings, index, { durationMinutes: Number(e.target.value) })} />
                    <Input label="Credits used" type="number" min={0} value={String(block.credits)} onChange={(e) => patchBlock(settings, setSettings, index, { credits: Number(e.target.value) })} />
                    <label className="flex items-end gap-2 text-sm text-slate-700 pb-2">
                      <input type="checkbox" checked={block.isActive !== false} onChange={(e) => patchBlock(settings, setSettings, index, { isActive: e.target.checked })} />
                      Active
                    </label>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={() => setSettings({ ...settings, creditUsageBlocks: settings.creditUsageBlocks.filter((_, i) => i !== index) })}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function withDefaults(data?: Partial<CreditSettings> | null): CreditSettings {
  const creditPacks = Array.isArray(data?.creditPacks) ? data.creditPacks : DEFAULT_PACKS;
  const usageBlocks = Array.isArray(data?.creditUsageBlocks) ? data.creditUsageBlocks : DEFAULT_USAGE_BLOCKS;
  return {
    signupFreeCredits: Number(data?.signupFreeCredits ?? 0),
    creditExpirationDays: Number(data?.creditExpirationDays ?? 60),
    creditUsdRate: Number(data?.creditUsdRate ?? 1),
    creditPacks: creditPacks.map((pack, index) => ({
      id: pack.id || `credits_${index + 1}`,
      label: pack.label || `${pack.credits || 0} Credits`,
      credits: Number(pack.credits || 0),
      bonusCredits: Number(pack.bonusCredits || 0),
      priceUsd: Number(pack.priceUsd || 0),
      revenueCatProductId: pack.revenueCatProductId || pack.id || "",
      isActive: pack.isActive !== false,
      sortOrder: Number(pack.sortOrder ?? index + 1),
    })),
    creditUsage: {
      chatTranscript: Number(data?.creditUsage?.chatTranscript ?? 5),
      videoRecording: Number(data?.creditUsage?.videoRecording ?? data?.creditUsage?.sessionRecording ?? 5),
      audioRecording: Number(data?.creditUsage?.audioRecording ?? data?.creditUsage?.sessionRecording ?? 5),
      sessionRecording: Number(data?.creditUsage?.sessionRecording ?? 5),
    },
    creditUsageBlocks: usageBlocks.map((block, index) => ({
      id: block.id || `usage_${index + 1}`,
      activity: block.activity || "Credit usage",
      sessionType: block.sessionType || "add_on",
      durationMinutes: Number(block.durationMinutes || 0),
      credits: Number(block.credits || 0),
      isActive: block.isActive !== false,
      sortOrder: Number(block.sortOrder ?? index + 1),
    })),
  };
}

function patchPack(settings: CreditSettings, setSettings: (next: CreditSettings) => void, index: number, patch: Partial<CreditPack>) {
  setSettings({ ...settings, creditPacks: settings.creditPacks.map((pack, i) => i === index ? { ...pack, ...patch } : pack) });
}

function patchBlock(settings: CreditSettings, setSettings: (next: CreditSettings) => void, index: number, patch: Partial<CreditUsageBlock>) {
  setSettings({ ...settings, creditUsageBlocks: settings.creditUsageBlocks.map((block, i) => i === index ? { ...block, ...patch } : block) });
}

function newPack(index: number): CreditPack {
  return { id: `credits_${Date.now()}`, label: "New Credit Pack", credits: 25, bonusCredits: 0, priceUsd: 19, revenueCatProductId: "", isActive: true, sortOrder: index + 1 };
}

function newUsageBlock(index: number): CreditUsageBlock {
  return { id: `usage_${Date.now()}`, activity: "New Credit Usage", sessionType: "chat", durationMinutes: 15, credits: 5, isActive: true, sortOrder: index + 1 };
}

function validate(settings: CreditSettings) {
  if (!Number.isFinite(settings.creditUsdRate) || settings.creditUsdRate <= 0) return "Custom purchase rate must be greater than 0";
  if (!Number.isFinite(settings.creditExpirationDays) || settings.creditExpirationDays <= 0) return "Credit expiration days must be greater than 0";
  if (!settings.creditPacks.length) return "Add at least one credit pack";
  for (const pack of settings.creditPacks) {
    if (!pack.id.trim() || !pack.label.trim() || pack.credits <= 0 || pack.priceUsd < 0 || (pack.bonusCredits || 0) < 0) {
      return "Each pack needs ID, label, positive credits, non-negative bonus, and non-negative price";
    }
  }
  if (!settings.creditUsageBlocks.length) return "Add at least one usage block";
  for (const block of settings.creditUsageBlocks) {
    if (!block.id.trim() || !block.activity.trim() || block.durationMinutes < 0 || block.credits < 0) {
      return "Each usage block needs ID, activity, non-negative minutes, and non-negative credits";
    }
  }
  return "";
}

function num(value?: number | null) {
  return Number(value || 0);
}
