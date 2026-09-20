"use client";

import { useEffect, useMemo, useState } from "react";
import { Topbar } from "../../components/Topbar";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
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
  appleProductId?: string;
  googleProductId?: string;
  isActive?: boolean;
  sortOrder?: number;
  isDraft?: boolean;
};

type TipPack = {
  id: string;
  label: string;
  amountUsd: number;
  revenueCatProductId?: string;
  appleProductId?: string;
  googleProductId?: string;
  isActive?: boolean;
  sortOrder?: number;
  isDraft?: boolean;
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
  tipPacks: TipPack[];
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

type StoreProviderStatus = {
  configured: boolean;
  missingEnvironmentVariables: string[];
};

type StoreSyncStatus = {
  apple: StoreProviderStatus;
  google: StoreProviderStatus;
  revenueCat: StoreProviderStatus;
};

type StorePriceSyncEvent = {
  status: string;
  message: string;
  at: string;
};

type StorePriceSyncJob = {
  _id: string;
  packId: string;
  packLabel: string;
  previousPriceUsd: number;
  targetPriceUsd: number;
  status: string;
  active: boolean;
  appleSubmittedAt?: string;
  appleConfirmedAt?: string;
  appleObservedPriceUsd?: number;
  googleSubmittedAt?: string;
  googleConfirmedAt?: string;
  googleObservedPriceUsd?: number;
  nextCheckAt?: string;
  lastCheckedAt?: string;
  lastError?: string;
  timeline: StorePriceSyncEvent[];
  createdAt: string;
};

const DEFAULT_PACKS: CreditPack[] = [
  { id: "credits_50", label: "50 Credits", credits: 50, priceUsd: 35, revenueCatProductId: "credits_50", appleProductId: "credits_50", googleProductId: "credits_50", isActive: true, sortOrder: 1 },
  { id: "credits_100", label: "100 Credits", credits: 100, priceUsd: 59, revenueCatProductId: "credits_100", appleProductId: "credits_100", googleProductId: "credits_100", isActive: true, sortOrder: 2 },
];

const DEFAULT_TIP_PACKS: TipPack[] = [
  { id: "tip_5", label: "Advisor Tip 5 USD", amountUsd: 5, revenueCatProductId: "tip_5", appleProductId: "tip_5", googleProductId: "tip_5", isActive: true, sortOrder: 1 },
  { id: "tip_10", label: "Advisor Tip 10 USD", amountUsd: 10, revenueCatProductId: "tip_10", appleProductId: "tip_10", googleProductId: "tip_10", isActive: true, sortOrder: 2 },
  { id: "tip_20", label: "Advisor Tip 20 USD", amountUsd: 20, revenueCatProductId: "tip_20", appleProductId: "tip_20", googleProductId: "tip_20", isActive: true, sortOrder: 3 },
  { id: "tip_50", label: "Advisor Tip 50 USD", amountUsd: 50, revenueCatProductId: "tip_50", appleProductId: "tip_50", googleProductId: "tip_50", isActive: true, sortOrder: 4 },
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
  const [storeSyncStatus, setStoreSyncStatus] = useState<StoreSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingPackId, setSyncingPackId] = useState<string | null>(null);
  const [pendingSyncPack, setPendingSyncPack] = useState<CreditPack | TipPack | null>(null);
  const [storePriceSyncs, setStorePriceSyncs] = useState<StorePriceSyncJob[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [settingsRes, summaryRes, storeStatusRes, syncsRes] = await Promise.all([
        api.get<CreditSettings>("/admin/settings/credits"),
        api.get<CreditSummary>("/admin/credits/summary"),
        api.get<StoreSyncStatus>("/admin/settings/credits/store-sync-status"),
        api.get<StorePriceSyncJob[]>("/admin/settings/credits/store-price-syncs"),
      ]);
      const loadedSettings = withDefaults(settingsRes.data);
      setSettings(loadedSettings);
      setSummary(summaryRes.data || null);
      setStoreSyncStatus(storeStatusRes.data || null);
      setStorePriceSyncs(syncsRes.data || []);
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

  useEffect(() => {
    if (!storePriceSyncs.some((sync) => sync.active)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await api.get<StorePriceSyncJob[]>("/admin/settings/credits/store-price-syncs");
        setStorePriceSyncs(response.data || []);
      } catch {
        // The next poll will retry; the visible job keeps its last known state.
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [storePriceSyncs]);

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
        creditPacks: settings.creditPacks.map(toCreditPackPayload),
        tipPacks: settings.tipPacks.map(omitDraftFlag),
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

  const prepareStorePriceSync = (pack: CreditPack | TipPack) => {
    if (!settings) return;
    const price = "priceUsd" in pack ? pack.priceUsd : pack.amountUsd;
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Store price must be greater than 0 USD");
      return;
    }
    const error = validate(settings);
    if (error) {
      toast.error(error);
      return;
    }
    if (!storeSyncStatus?.apple.configured || !storeSyncStatus?.google.configured) {
      toast.error("Apple and Google credentials must both be ready before syncing");
      return;
    }
    setPendingSyncPack(pack);
  };

  const syncStorePrice = async () => {
    if (!settings || !pendingSyncPack) return;
    const pack = pendingSyncPack;
    const price = "priceUsd" in pack ? pack.priceUsd : pack.amountUsd;

    setSyncingPackId(pack.id);
    try {
      const response = await api.post<StorePriceSyncJob>(
        `/admin/settings/credits/${encodeURIComponent(pack.id)}/store-price-sync`,
        { targetPriceUsd: price },
      );
      if (!response.data) throw new Error("Store coordination returned no job");
      setStorePriceSyncs((current) => [response.data as StorePriceSyncJob, ...current.filter((item) => item._id !== response.data?._id)]);
      toast.info("Apple update queued. Google will wait until Apple is confirmed.");
    } catch (err) {
      const msg = err instanceof ApiError || err instanceof Error ? err.message : "Failed to update store price";
      toast.error(msg);
    } finally {
      setSyncingPackId(null);
      setPendingSyncPack(null);
    }
  };

  const checkStorePriceNow = async (syncId: string) => {
    try {
      await api.post(`/admin/settings/credits/store-price-syncs/${encodeURIComponent(syncId)}/check-now`);
      toast.info("Store price check queued");
      const response = await api.get<StorePriceSyncJob[]>("/admin/settings/credits/store-price-syncs");
      setStorePriceSyncs(response.data || []);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to queue store check");
    }
  };

  const activePacks = useMemo(
    () => settings?.creditPacks.filter((pack) => pack.isActive !== false).length || 0,
    [settings?.creditPacks],
  );

  const activeTipPacks = useMemo(
    () => settings?.tipPacks.filter((pack) => pack.isActive !== false).length || 0,
    [settings?.tipPacks],
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
          <Stat label="Active packs" value={`${activePacks} packs / ${activeTipPacks} tips`} />
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
              <h2 className="text-lg font-semibold text-slate-900">Store price sync readiness</h2>
              <p className="mt-1 text-sm text-slate-500">Credentials stay on the backend. Apple and Google must be ready for live updates; RevenueCat reads the localized store prices automatically.</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <ProviderStatus label="Apple App Store" status={storeSyncStatus?.apple} />
                <ProviderStatus label="Google Play" status={storeSyncStatus?.google} />
                <ProviderStatus label="RevenueCat" status={storeSyncStatus?.revenueCat} />
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Credit Packs</h2>
                  <p className="text-sm text-slate-500">Configure credit values and map each pack to its Apple and Google store products.</p>
                </div>
                <Button variant="outline" onClick={() => setSettings({ ...settings, creditPacks: [...settings.creditPacks, newPack(settings.creditPacks.length)] })}>
                  Add Pack
                </Button>
              </div>
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Enter an Apple-supported USD price point, then start a coordinated update. Apple is monitored first; Google updates only after Apple’s US price is confirmed.
              </div>
              <div className="space-y-3">
                {settings.creditPacks.map((pack, index) => {
                  const identityLocked = pack.isDraft !== true;
                  return (
                  <div key={`${pack.id}-${index}`} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 rounded-lg border border-slate-100 p-3">
                    <Input label="ID" value={pack.id} disabled={identityLocked} title={identityLocked ? "ID is locked after the pack is saved" : undefined} onChange={(e) => patchPack(settings, setSettings, index, { id: e.target.value })} />
                    <Input label="Label" value={pack.label} onChange={(e) => patchPack(settings, setSettings, index, { label: e.target.value })} />
                    <Input label="Credits" type="number" min={1} value={String(pack.credits)} onChange={(e) => patchPack(settings, setSettings, index, { credits: Number(e.target.value) })} />
                    <Input label="Reference USD" type="number" min={0} step={0.01} value={String(pack.priceUsd)} onChange={(e) => patchPack(settings, setSettings, index, { priceUsd: Number(e.target.value) })} />
                    <Input label="RevenueCat fallback ID" value={pack.revenueCatProductId || ""} disabled={identityLocked} title={identityLocked ? "RevenueCat product mapping is locked after the pack is saved" : undefined} onChange={(e) => patchPack(settings, setSettings, index, { revenueCatProductId: e.target.value })} />
                    <Input label="Apple product ID" value={pack.appleProductId || ""} disabled={identityLocked} title={identityLocked ? "Apple product mapping is locked after the pack is saved" : undefined} onChange={(e) => patchPack(settings, setSettings, index, { appleProductId: e.target.value })} />
                    <Input label="Google product ID" value={pack.googleProductId || ""} disabled={identityLocked} title={identityLocked ? "Google product mapping is locked after the pack is saved" : undefined} onChange={(e) => patchPack(settings, setSettings, index, { googleProductId: e.target.value })} />
                    <label className="flex items-end gap-2 text-sm text-slate-700 pb-2">
                      <input type="checkbox" checked={pack.isActive !== false} onChange={(e) => patchPack(settings, setSettings, index, { isActive: e.target.checked })} />
                      Active
                    </label>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={() => setSettings({ ...settings, creditPacks: settings.creditPacks.filter((_, i) => i !== index) })}>
                        Delete
                      </Button>
                    </div>
                    <div className="md:col-span-2 xl:col-span-4 flex flex-col items-start gap-2 border-t border-slate-100 pt-3">
                      <Button
                        variant="success"
                        onClick={() => prepareStorePriceSync(pack)}
                        loading={syncingPackId === pack.id}
                        disabled={pack.isDraft === true || syncingPackId !== null || pack.isActive === false || storePriceSyncs.some((sync) => sync.packId === pack.id && sync.active)}
                        title={pack.isDraft === true ? "Save this pack before starting a coordinated update" : undefined}
                      >
                        Start Coordinated Update
                      </Button>
                      {storePriceSyncs.find((sync) => sync.packId === pack.id) ? (
                        <StoreSyncProgress
                          sync={storePriceSyncs.find((sync) => sync.packId === pack.id) as StorePriceSyncJob}
                          onCheckNow={checkStorePriceNow}
                        />
                      ) : null}
                    </div>
                  </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Advisor Tip Packages</h2>
                  <p className="text-sm text-slate-500">Configure client-facing tip tiers and map each tip to Apple and Google store products.</p>
                </div>
                <Button variant="outline" onClick={() => setSettings({ ...settings, tipPacks: [...settings.tipPacks, newTipPack(settings.tipPacks.length)] })}>
                  Add Tip Package
                </Button>
              </div>
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Enter an Apple-supported USD price point, then start a coordinated update. Apple is monitored first; Google updates only after Apple’s US price is confirmed.
              </div>
              <div className="space-y-3">
                {settings.tipPacks.map((pack, index) => {
                  const identityLocked = pack.isDraft !== true;
                  return (
                  <div key={`${pack.id}-${index}`} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 rounded-lg border border-slate-100 p-3">
                    <Input label="ID" value={pack.id} disabled={identityLocked} title={identityLocked ? "ID is locked after the tip package is saved" : undefined} onChange={(e) => patchTipPack(settings, setSettings, index, { id: e.target.value })} />
                    <Input label="Label" value={pack.label} onChange={(e) => patchTipPack(settings, setSettings, index, { label: e.target.value })} />
                    <Input label="Amount (USD)" type="number" min={0.01} step={0.01} value={String(pack.amountUsd)} onChange={(e) => patchTipPack(settings, setSettings, index, { amountUsd: Number(e.target.value) })} />
                    <Input label="RevenueCat fallback ID" value={pack.revenueCatProductId || ""} disabled={identityLocked} title={identityLocked ? "RevenueCat product mapping is locked after the tip package is saved" : undefined} onChange={(e) => patchTipPack(settings, setSettings, index, { revenueCatProductId: e.target.value })} />
                    <Input label="Apple product ID" value={pack.appleProductId || ""} disabled={identityLocked} title={identityLocked ? "Apple product mapping is locked after the tip package is saved" : undefined} onChange={(e) => patchTipPack(settings, setSettings, index, { appleProductId: e.target.value })} />
                    <Input label="Google product ID" value={pack.googleProductId || ""} disabled={identityLocked} title={identityLocked ? "Google product mapping is locked after the tip package is saved" : undefined} onChange={(e) => patchTipPack(settings, setSettings, index, { googleProductId: e.target.value })} />
                    <label className="flex items-end gap-2 text-sm text-slate-700 pb-2">
                      <input type="checkbox" checked={pack.isActive !== false} onChange={(e) => patchTipPack(settings, setSettings, index, { isActive: e.target.checked })} />
                      Active
                    </label>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={() => setSettings({ ...settings, tipPacks: settings.tipPacks.filter((_, i) => i !== index) })}>
                        Delete
                      </Button>
                    </div>
                    <div className="md:col-span-2 xl:col-span-4 flex flex-col items-start gap-2 border-t border-slate-100 pt-3">
                      <Button
                        variant="success"
                        onClick={() => prepareStorePriceSync(pack)}
                        loading={syncingPackId === pack.id}
                        disabled={pack.isDraft === true || syncingPackId !== null || pack.isActive === false || storePriceSyncs.some((sync) => sync.packId === pack.id && sync.active)}
                        title={pack.isDraft === true ? "Save this tip package before starting a coordinated update" : undefined}
                      >
                        Start Coordinated Update
                      </Button>
                      {storePriceSyncs.find((sync) => sync.packId === pack.id) ? (
                        <StoreSyncProgress
                          sync={storePriceSyncs.find((sync) => sync.packId === pack.id) as StorePriceSyncJob}
                          onCheckNow={checkStorePriceNow}
                        />
                      ) : null}
                    </div>
                  </div>
                  );
                })}
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
      <StorePriceSyncDialog
        pack={pendingSyncPack}
        loading={Boolean(syncingPackId)}
        onClose={() => {
          if (!syncingPackId) setPendingSyncPack(null);
        }}
        onConfirm={syncStorePrice}
      />
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

function ProviderStatus({ label, status }: { label: string; status?: StoreProviderStatus }) {
  const configured = status?.configured === true;
  return (
    <div className={`rounded-lg border px-4 py-3 ${configured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className={`text-sm font-semibold ${configured ? "text-emerald-800" : "text-amber-900"}`}>
        {label}: {configured ? "Ready" : "Setup required"}
      </div>
      {!configured && status?.missingEnvironmentVariables.length ? (
        <div className="mt-1 text-xs text-amber-800 break-words">
          Missing: {status.missingEnvironmentVariables.join(", ")}
        </div>
      ) : null}
    </div>
  );
}

function StoreSyncProgress({ sync, onCheckNow }: { sync: StorePriceSyncJob; onCheckNow: (id: string) => void }) {
  const appleDone = Boolean(sync.appleConfirmedAt);
  const googleDone = Boolean(sync.googleConfirmedAt);
  const failed = ["failed", "manual_review"].includes(sync.status);
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${failed ? "bg-red-100 text-red-800" : sync.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
              {syncStatusLabel(sync.status)}
            </span>
            <span className="text-sm font-semibold text-slate-900">${sync.previousPriceUsd.toFixed(2)} → ${sync.targetPriceUsd.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {sync.lastCheckedAt ? `Last checked ${formatSyncTime(sync.lastCheckedAt)}` : `Started ${formatSyncTime(sync.createdAt)}`}
            {sync.nextCheckAt ? ` · Next check ${formatSyncTime(sync.nextCheckAt)}` : ""}
          </p>
        </div>
        {sync.active ? <Button size="sm" variant="outline" onClick={() => onCheckNow(sync._id)}>Check now</Button> : null}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SyncProviderStep
          label="Apple App Store"
          done={appleDone}
          active={!appleDone && !failed}
          observed={sync.appleObservedPriceUsd}
          confirmedAt={sync.appleConfirmedAt}
        />
        <SyncProviderStep
          label="Google Play"
          done={googleDone}
          active={appleDone && !googleDone && !failed}
          waiting={!appleDone && !failed}
          observed={sync.googleObservedPriceUsd}
          confirmedAt={sync.googleConfirmedAt}
        />
      </div>
      {sync.lastError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{sync.lastError}</p> : null}
      {sync.timeline?.length ? (
        <p className="mt-3 text-xs text-slate-600">Latest: {sync.timeline[sync.timeline.length - 1].message}</p>
      ) : null}
    </div>
  );
}

function SyncProviderStep({ label, done, active, waiting, observed, confirmedAt }: { label: string; done: boolean; active: boolean; waiting?: boolean; observed?: number; confirmedAt?: string }) {
  return (
    <div className={`rounded-lg border px-3 py-3 ${done ? "border-emerald-200 bg-emerald-50" : active ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-900">{label}</span>
        <span className={`text-xs font-semibold ${done ? "text-emerald-700" : active ? "text-blue-700" : "text-slate-500"}`}>
          {done ? "Confirmed" : active ? "Monitoring" : waiting ? "Waiting for Apple" : "Pending"}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {confirmedAt ? formatSyncTime(confirmedAt) : observed !== undefined ? `Observed $${observed.toFixed(2)}` : "No confirmed price yet"}
      </p>
    </div>
  );
}

function syncStatusLabel(status: string) {
  const labels: Record<string, string> = {
    apple_queued: "Apple queued",
    apple_submitting: "Submitting to Apple",
    apple_pending: "Waiting for Apple",
    apple_confirmed: "Apple confirmed",
    google_updating: "Updating Google",
    google_pending: "Waiting for Google",
    completed: "Completed",
    manual_review: "Manual action required",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function StorePriceSyncDialog({
  pack,
  loading,
  onClose,
  onConfirm,
}: {
  pack: CreditPack | TipPack | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const price = pack ? ("priceUsd" in pack ? pack.priceUsd : pack.amountUsd) : 0;
  return (
    <Modal open={Boolean(pack)} onClose={onClose} hideClose size="sm">
      {pack ? (
        <div className="py-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
              <path d="M12 3v18M16.5 7.5c0-1.66-2.01-3-4.5-3s-4.5 1.34-4.5 3 2.01 3 4.5 3 4.5 1.34 4.5 3-2.01 3-4.5 3-4.5-1.34-4.5-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          <div className="mt-4 text-center">
            <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              Live store change
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-950 sm:text-2xl">Confirm price update</h2>
            <p className="mt-1 text-sm text-slate-500">
              Apple will update first. Google will update automatically only after Apple is confirmed.
            </p>
          </div>

          <div className="my-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">New base price</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-slate-950">${price.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-500">USD · localized prices may vary by region</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StoreTarget label="Apple App Store" productId={pack.appleProductId || "Not mapped"} tone="slate" />
            <StoreTarget label="Google Play" productId={pack.googleProductId || "Not mapped"} tone="emerald" />
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
            This creates a monitored background job. You can close this page safely; progress continues on the server and survives restarts.
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="w-full">
              Cancel
            </Button>
            <Button type="button" variant="success" onClick={onConfirm} loading={loading} className="w-full">
              Start Apple First
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function StoreTarget({ label, productId, tone }: { label: string; productId: string; tone: "slate" | "emerald" }) {
  const classes = tone === "emerald"
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : "border-slate-200 bg-white text-slate-950";
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${classes}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-1 truncate font-mono text-xs opacity-70" title={productId}>{productId}</p>
    </div>
  );
}

function withDefaults(data?: Partial<CreditSettings> | null): CreditSettings {
  const creditPacks = Array.isArray(data?.creditPacks) ? data.creditPacks : DEFAULT_PACKS;
  const tipPacks = Array.isArray(data?.tipPacks) ? data.tipPacks : DEFAULT_TIP_PACKS;
  const usageBlocks = Array.isArray(data?.creditUsageBlocks) ? data.creditUsageBlocks : DEFAULT_USAGE_BLOCKS;
  return {
    signupFreeCredits: Number(data?.signupFreeCredits ?? 0),
    creditExpirationDays: Number(data?.creditExpirationDays ?? 60),
    creditUsdRate: Number(data?.creditUsdRate ?? 1),
    creditPacks: creditPacks.map((pack, index) => ({
      id: pack.id || `credits_${index + 1}`,
      label: pack.label || `${pack.credits || 0} Credits`,
      credits: Number(pack.credits || 0),
      bonusCredits: 0,
      priceUsd: Number(pack.priceUsd || 0),
      revenueCatProductId: pack.revenueCatProductId || pack.id || "",
      appleProductId: pack.appleProductId || pack.revenueCatProductId || pack.id || "",
      googleProductId: pack.googleProductId || pack.revenueCatProductId || pack.id || "",
      isActive: pack.isActive !== false,
      sortOrder: Number(pack.sortOrder ?? index + 1),
    })),
    tipPacks: tipPacks.map((pack, index) => ({
      id: pack.id || `tip_${index + 1}`,
      label: pack.label || `Advisor Tip ${pack.amountUsd || 0} USD`,
      amountUsd: Number(pack.amountUsd || 0),
      revenueCatProductId: pack.revenueCatProductId || pack.id || "",
      appleProductId: pack.appleProductId || pack.revenueCatProductId || pack.id || "",
      googleProductId: pack.googleProductId || pack.revenueCatProductId || pack.id || "",
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

function patchTipPack(settings: CreditSettings, setSettings: (next: CreditSettings) => void, index: number, patch: Partial<TipPack>) {
  setSettings({ ...settings, tipPacks: settings.tipPacks.map((pack, i) => i === index ? { ...pack, ...patch } : pack) });
}

function patchBlock(settings: CreditSettings, setSettings: (next: CreditSettings) => void, index: number, patch: Partial<CreditUsageBlock>) {
  setSettings({ ...settings, creditUsageBlocks: settings.creditUsageBlocks.map((block, i) => i === index ? { ...block, ...patch } : block) });
}

function newPack(index: number): CreditPack {
  return { id: `credits_${Date.now()}`, label: "New Credit Pack", credits: 25, priceUsd: 19, revenueCatProductId: "", appleProductId: "", googleProductId: "", isActive: true, sortOrder: index + 1, isDraft: true };
}

function newTipPack(index: number): TipPack {
  return { id: `tip_${Date.now()}`, label: "New Advisor Tip", amountUsd: 15, revenueCatProductId: "", appleProductId: "", googleProductId: "", isActive: true, sortOrder: index + 1, isDraft: true };
}

function omitDraftFlag<T extends { isDraft?: boolean }>(item: T): Omit<T, "isDraft"> {
  const copy = { ...item };
  delete copy.isDraft;
  return copy;
}

function toCreditPackPayload(pack: CreditPack): Omit<CreditPack, "isDraft"> {
  return { ...omitDraftFlag(pack), bonusCredits: 0 };
}

function newUsageBlock(index: number): CreditUsageBlock {
  return { id: `usage_${Date.now()}`, activity: "New Credit Usage", sessionType: "chat", durationMinutes: 15, credits: 5, isActive: true, sortOrder: index + 1 };
}

function validate(settings: CreditSettings) {
  if (!Number.isFinite(settings.creditUsdRate) || settings.creditUsdRate <= 0) return "Custom purchase rate must be greater than 0";
  if (!Number.isFinite(settings.creditExpirationDays) || settings.creditExpirationDays <= 0) return "Credit expiration days must be greater than 0";
  if (!settings.creditPacks.length) return "Add at least one credit pack";
  for (const pack of settings.creditPacks) {
    if (!pack.id.trim() || !pack.label.trim() || pack.credits <= 0 || pack.priceUsd < 0) {
      return "Each pack needs ID, label, positive credits, and non-negative price";
    }
    if (pack.isActive !== false && (!pack.appleProductId?.trim() || !pack.googleProductId?.trim())) {
      return "Each active pack needs both Apple and Google product IDs";
    }
  }
  const ids = settings.creditPacks.map((pack) => pack.id.trim());
  if (new Set(ids).size !== ids.length) return "Credit pack IDs must be unique";
  const appleIds = settings.creditPacks.map((pack) => pack.appleProductId?.trim()).filter(Boolean);
  if (new Set(appleIds).size !== appleIds.length) return "Apple product IDs must be unique";
  const googleIds = settings.creditPacks.map((pack) => pack.googleProductId?.trim()).filter(Boolean);
  if (new Set(googleIds).size !== googleIds.length) return "Google product IDs must be unique";

  if (settings.tipPacks?.length) {
    for (const tip of settings.tipPacks) {
      if (!tip.id.trim() || !tip.label.trim() || tip.amountUsd <= 0) {
        return "Each tip package needs ID, label, and positive amount USD";
      }
      if (tip.isActive !== false && (!tip.appleProductId?.trim() || !tip.googleProductId?.trim())) {
        return "Each active tip package needs both Apple and Google product IDs";
      }
    }
    const tipIds = settings.tipPacks.map((t) => t.id.trim());
    if (new Set(tipIds).size !== tipIds.length) return "Tip package IDs must be unique";
    const tipAppleIds = settings.tipPacks.map((t) => t.appleProductId?.trim()).filter(Boolean);
    if (new Set(tipAppleIds).size !== tipAppleIds.length) return "Apple product IDs for tips must be unique";
    const tipGoogleIds = settings.tipPacks.map((t) => t.googleProductId?.trim()).filter(Boolean);
    if (new Set(tipGoogleIds).size !== tipGoogleIds.length) return "Google product IDs for tips must be unique";
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
