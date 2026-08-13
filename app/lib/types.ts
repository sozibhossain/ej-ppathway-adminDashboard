export type Role = "user" | "advisor" | "admin" | "sub_admin";
export type UserStatus =
  | "active"
  | "suspended"
  | "deactivated"
  | "pending_verification";

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  profilePhoto?: string;
  country?: string;
  state?: string;
  city?: string;
  currency?: string;
  timezone?: string;
  dateOfBirth?: string;
  /** Legacy free-text label; still used as the sub-admin role label. */
  location?: string;
  permissions?: string[];
  roleKey?: string;
  roleLabel?: string;
  jobTitle?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  createdBy?: { _id?: string; name?: string; email?: string } | string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
}

export interface PermissionItem {
  key: string;
  label: string;
}
export interface PermissionGroup {
  section: string;
  permissions: PermissionItem[];
}
export interface RolePreset {
  key: string;
  label: string;
  description: string;
  permissions: string[];
}
export interface PermissionsCatalog {
  groups: PermissionGroup[];
  permissions: string[];
  roles: RolePreset[];
}

export interface AdminActivity {
  _id: string;
  action: string;
  description?: string;
  targetType?: string;
  targetUser?: { _id?: string; name?: string; email?: string; role?: string } | null;
  createdAt: string;
}

export interface SubAdminDetails extends AdminUser {
  roleLabel?: string;
  recentActivity?: AdminActivity[];
}

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface Wallet {
  _id: string;
  user: string;
  balance: number;
  freeCredits: number;
  earningsBalance?: number;
  pendingPayouts?: number;
  totalWithdrawn?: number;
}

export interface UserListItem extends AdminUser {
  wallet?: Wallet | null;
  activeSubscription?: {
    _id: string;
    user: string;
    plan?: string;
    planName?: string;
    status: string;
  } | null;
  sessionsCount?: number;
  payments?: number;
}

export interface UserDetailsResponse {
  user: AdminUser;
  wallet?: Wallet | null;
  sessionsCount?: number;
  totalSpent?: number;
  activeSubscription?: { plan?: { name: string } | string; planName?: string } | null;
  subscriptions?: Array<{
    _id: string;
    plan?: { name?: string } | string;
    planName?: string;
    status: string;
    pricePerMonthUsd?: number;
    createdAt?: string;
    renewsAt?: string;
  }>;
  recentTransactions?: Transaction[];
  refunds?: Transaction[];
  adminActivity?: AdminActivity[];
  recentSessions?: SessionItem[];
}

export interface AdvisorPricing {
  chatPerMin?: number;
  callPerMin?: number;
  videoPerMin?: number;
}

export interface AdvisorSessionTypes {
  chat?: boolean;
  call?: boolean;
  video?: boolean;
}

export type AdvisorScheduleSlot = {
  from?: string;
  to?: string;
};

export type AdvisorDateAvailability = {
  unavailable?: boolean;
  slots?: AdvisorScheduleSlot[];
};

export type AdvisorDaySchedule = {
  enabled?: boolean;
  from?: string;
  to?: string;
  slots?: AdvisorScheduleSlot[];
};

export interface AdvisorProfile {
  _id: string;
  user: string;
  professionalTitle?: string;
  bio?: string;
  detailedDescription?: string;
  yearsOfExperience?: string | number;
  expertise?: string[];
  styles?: string[];
  languages?: string[];
  audioMessageUrl?: string;
  introVideoUrl?: string;
  pricing?: AdvisorPricing;
  pricingOverrideEnabled?: boolean;
  sessionTypes?: AdvisorSessionTypes;
  avgRating?: number;
  ratingsCount?: number;
  tier?: "silver" | "gold" | "platinum";
  totalSessions?: number;
  earnings?: number;
  retentionRate?: number;
  refundIndex?: number;
  isOnline?: boolean;
  lastSeenAt?: string;
  autoOnlineMode?: boolean;
  weeklySchedule?: Record<string, AdvisorDaySchedule>;
  dateAvailability?: Record<string, AdvisorDateAvailability>;
  updatedAt?: string;
}

export interface AdvisorMetrics {
  sessions: {
    total: number;
    completed: number;
    cancelled: number;
    missed: number;
    avgSessionMinutes: number;
    repeatClientRate: number;
    retentionRate: number;
  };
  finance: {
    totalRevenue: number;
    advisorEarnings: number;
    pendingPayouts: number;
    totalPaidOut: number;
    refundAmount: number;
    chargebackAmount: number;
  };
  availability: {
    isOnline: boolean;
    availableNow: boolean;
    weeklySchedule: Record<string, AdvisorDaySchedule> | null;
    dateAvailability?: Record<string, AdvisorDateAvailability> | null;
  };
}

export interface AdvisorListItem {
  user: AdminUser;
  profile?: AdvisorProfile | null;
}

export interface AdvisorApplication {
  _id: string;
  user: AdminUser & { profilePhoto?: string };
  stage:
    | "application"
    | "pre_recorded_interview"
    | "live_interview"
    | "contract"
    | "decision";
  status:
    | "new"
    | "pending_review"
    | "live_interview"
    | "under_review"
    | "interview_pending"
    | "scheduled"
    | "awaiting_submission"
    | "awaiting_signature"
    | "awaiting_approval"
    | "approved"
    | "rejected";
  professionalTitle?: string;
  bio?: string;
  yearsOfExperience?: string;
  availableFiveHoursPerDay?: string;
  baptizedInHolySpirit?: string;
  profile?: AdvisorProfile | null;
  expertise?: string[];
  styles?: string[];
  languages?: string[];
  audioMessageUrl?: string;
  introVideoUrl?: string;
  pricing?: AdvisorPricing;
  preRecordedAnswers?: Array<{ question: string; answer: string }>;
  liveInterview?: {
    scheduledAt?: string;
    roomName?: string;
    notes?: string;
  };
  contract?: {
    sentAt?: string;
    signedAt?: string;
    url?: string;
    signerName?: string;
    signerIp?: string;
    signatureImageUrl?: string;
    signedPdfUrl?: string;
  };
  rejectionReason?: string;
  lastNotification?: {
    action?: string;
    subject?: string;
    success?: boolean;
    skipped?: boolean;
    error?: string;
    sentAt?: string;
  };
  applicantDetails?: {
    dateOfBirth?: string;
    address?: string;
    state?: string;
    city?: string;
    zip?: string;
    country?: string;
  };
  createdAt: string;
}

export interface SessionItem {
  _id: string;
  sessionCode?: string;
  user?: AdminUser & { profilePhoto?: string };
  advisor?: AdminUser & { profilePhoto?: string };
  advisorTier?: "silver" | "gold" | "platinum" | string;
  type?: "chat" | "call" | "video";
  status?:
    | "pending"
    | "live"
    | "completed"
    | "cancelled"
    | "disputed"
    | "flagged"
    | "no_show";
  duration?: number;
  durationMinutes?: number;
  actualDurationSec?: number;
  scheduledFor?: string;
  startedAt?: string;
  endedAt?: string;
  chargedAmount?: number;
  creditsUsed?: number;
  refundIssued?: number;
  cancelReason?: string;
  cancelledAt?: string;
  flagReason?: string;
  flaggedAt?: string;
  internalNotes?: string;
  createdAt: string;
  recordingUrl?: string;
  recordingStatus?: "pending" | "starting" | "recording" | "completed" | "failed";
  recordingError?: string;
  transcriptUrl?: string;
  hasTranscript?: boolean;
  messageCount?: number;
  estimatedCost?: number;
  egressId?: string;
  livekitRoom?: string;
}

export interface TranscriptMessage {
  _id: string;
  text?: string;
  attachments?: string[];
  createdAt: string;
  sender?: { _id?: string; name?: string; profilePhoto?: string };
}

export interface TranscriptResponse {
  session: SessionItem;
  messages: TranscriptMessage[];
}

export interface Complaint {
  _id: string;
  kind: "complain" | "safety_report";
  user?: AdminUser;
  advisor?: AdminUser;
  session?: {
    _id: string;
    sessionCode?: string;
    type?: string;
    chargedAmount?: number;
    actualDurationSec?: number;
    durationMinutes?: number;
    scheduledFor?: string;
    startedAt?: string;
    endedAt?: string;
    recordingUrl?: string;
    transcriptUrl?: string;
    status?: string;
  };
  issueType: string;
  description?: string;
  documents?: string[];
  status:
    | "pending"
    | "reviewing"
    | "pending_information"
    | "complete"
    | "reject"
    | "rejected"
    | "escalated";
  resolutionNote?: string;
  resolvedBy?: AdminUser;
  createdAt: string;
  updatedAt?: string;
}

export type DisputeStatus =
  | "open"
  | "investigating"
  | "resolved"
  | "rejected"
  | "cancelled";

export type DisputeResolution =
  | "full_refund"
  | "partial_refund"
  | "free_reschedule"
  | "assign_another_advisor"
  | "no_action";

export interface Dispute {
  _id: string;
  user?: AdminUser;
  advisor?: AdminUser;
  session?: {
    _id: string;
    sessionCode?: string;
    type?: string;
    chargedAmount?: number;
    actualDurationSec?: number;
    durationMinutes?: number;
    scheduledFor?: string;
    startedAt?: string;
    endedAt?: string;
    recordingUrl?: string;
    transcriptUrl?: string;
    status?: string;
  };
  disputeType: string;
  details?: string;
  expectedResolution: DisputeResolution;
  documents?: string[];
  status: DisputeStatus;
  refundAmount?: number;
  resolutionApplied?: DisputeResolution;
  resolutionNote?: string;
  resolvedBy?: AdminUser;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Transaction {
  _id: string;
  txCode?: string;
  type: string;
  status: string;
  user?: AdminUser;
  advisor?: AdminUser;
  session?: SessionItem | string;
  plan?: { _id?: string; name?: string } | string;
  amount: number;
  currency?: string;
  provider?: string;
  withdrawalMethod?: string;
  description?: string;
  withdrawalStatus?: "requested" | "approved" | "processing" | "paid" | "failed" | "rejected";
  createdAt: string;
}

export interface CountryPrice {
  country: string;       // ISO-3166 alpha-2
  currency?: string;     // optional; defaults to the country's currency
  pricePerMonth: number; // price in local currency units
}

export interface Plan {
  _id: string;
  name: string;
  description?: string;
  audienceLimit?: string;
  pricePerMonth: number; // base USD price
  countryPrices?: CountryPrice[];
  benefits: string[];
  isActive: boolean;
  sortOrder?: number;
}

export interface Currency {
  _id: string;
  country: string;       // ISO-3166 alpha-2
  countryName: string;
  currency: string;      // ISO-4217
  symbol: string;
  usdRate: number;       // units of `currency` per 1 USD
  roundTo: number;
  zeroDecimal?: boolean;
  isBase?: boolean;
  isActive: boolean;
  sortOrder?: number;
}

export interface Blog {
  _id: string;
  title: string;
  type?: string;
  content?: string;
  authorName?: string;
  authorTitle?: string;
  profilePicture?: string;
  thumbnail?: string;
  isPublished?: boolean;
  publishedAt?: string;
  createdAt: string;
  readMinutes?: number;
}

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface CmsPage {
  _id?: string;
  slug: string;
  title: string;
  content: string;
}

export interface ShowcaseReview {
  _id: string;
  rating: number;
  comment?: string;
  showcaseName?: string;
  showcaseLocation?: string;
  showcasePhoto?: string;
  isAdminShowcase: boolean;
  isFeaturedTestimonial?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserReview {
  _id: string;
  rating: number;
  comment?: string;
  sessionType?: string;
  createdAt: string;
  user?: { _id?: string; name?: string; profilePhoto?: string; email?: string };
  advisor?: { _id?: string; name?: string; profilePhoto?: string };
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ChatItem {
  _id: string;
  kind: "session" | "admin";
  participants: AdminUser[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCounts?: Record<string, number>;
}

export interface ChatMessage {
  _id: string;
  chat: string;
  sender: AdminUser | string;
  text?: string;
  attachments?: string[];
  readBy?: string[];
  createdAt: string;
}

export type DashboardPeriod = "day" | "week" | "month" | "year";

export interface DashboardOverview {
  period?: DashboardPeriod;
  metrics?: {
    newUsers: number;
    newAdvisors: number;
    sessions: number;
    subscriptions: number;
    revenue: number;
  };
  newSubsByPlan?: Array<{ label: string; value: number }>;
  appointments?: { today: number; week: number; month: number };
  refunds?: { today: number; week: number; month: number; year: number; amountYear: number };
  serviceCategories?: Array<{ label: string; value: number; color?: string }>;
  advisorPerformance?: {
    total: number;
    active: number;
    online: number;
    suspended: number;
    topPerformers: Array<{ name: string; profilePhoto?: string; sessions: number; rating: number }>;
  };
  approvals?: { approved: number; pending: number; rejected: number };
  revenueByMonth?: Array<{ month: number; total: number }>;
  recentTransactions: Transaction[];
  totals: {
    users: number;
    advisors: number;
    subscriptions: number;
    sessions: number;
    revenue: number;
  };
}

export interface PeriodAmounts {
  today: number;
  week: number;
  month: number;
  year: number;
  allTime: number;
}

export interface AmountCount {
  amount: number;
  count: number;
}

export interface FinanceOverview {
  monthlyRevenue: number;
  pendingPayouts: number;
  pendingPayoutsCount: number;
  platformRevenue?: PeriodAmounts;
  netRevenue?: PeriodAmounts;
  wallet?: { totalDeposits: number; totalBalance: number; totalFreeCredits: number };
  payouts?: {
    pending: AmountCount;
    approved: AmountCount;
    paid: AmountCount;
    failed: AmountCount;
  };
  advisors?: {
    totalEarnings: number;
    topEarner?: { name: string; profilePhoto?: string; amount: number } | null;
    lowestRated?: { name: string; rating: number } | null;
  };
  revenueByMonth?: Array<{ month: number; total: number }>;
  revenueSources?: Record<string, number>;
}

export interface AdvisorEarning {
  advisor: { _id: string; name: string; email?: string; profilePhoto?: string } | null;
  tier: "silver" | "gold" | "platinum";
  totalSessions: number;
  grossEarnings: number;
  netEarnings: number;
  paidEarnings: number;
}

/* ----- Payouts (Hyperwallet) ----- */

export interface PayoutConfig {
  provider: "hyperwallet" | "manual";
  hyperwalletEnabled: boolean;
  hyperwalletConfigured: boolean;
  payoutCreditUsdRate: number;
  payoutCurrency: string;
  minPayoutCredits: number;
}

export interface PayoutAccountInfo {
  configured: boolean;
  userToken?: string | null;
  status?: string | null;
  hasMethod: boolean;
  methodType?: "bank_account" | "paypal" | null;
  methodLabel?: string;
  currency?: string;
  verified?: boolean;
}

export interface PayoutAccountRow {
  advisor: { _id: string; name: string; email?: string; profilePhoto?: string; country?: string };
  account: PayoutAccountInfo;
  availableCredits: number;
  availableUsd: number;
  pendingCredits: number;
  pendingUsd: number;
  totalWithdrawnCredits: number;
  totalEarnedCredits: number;
}

export interface PayoutTransferMethod {
  token: string;
  type: string;
  status?: string;
  currency?: string;
  detail?: string;
}

export interface PayoutAccountDetails {
  advisor: {
    _id: string;
    name: string;
    email?: string;
    profilePhoto?: string;
    country?: string;
    state?: string;
    city?: string;
    dateOfBirth?: string;
  };
  account: PayoutAccountInfo;
  transferMethods: PayoutTransferMethod[];
  balance: {
    availableCredits: number;
    availableUsd: number;
    pendingCredits: number;
    pendingUsd: number;
    totalWithdrawnCredits: number;
  };
  config: PayoutConfig;
  recentPayouts: PayoutTransaction[];
}

export interface PayoutTransaction extends Transaction {
  amountUsd?: number;
  payoutCredits?: number;
  payoutRateUsd?: number;
  withdrawalStatus?: "requested" | "approved" | "processing" | "paid" | "failed" | "rejected";
  withdrawalFailureReason?: string;
  withdrawalRejectedReason?: string;
  hyperwalletPaymentToken?: string;
  hyperwalletStatus?: string;
}

export interface PayoutStatAmount {
  credits: number;
  usd: number;
  count: number;
}

export interface PayoutStats {
  config: PayoutConfig;
  requested: PayoutStatAmount;
  processing: PayoutStatAmount;
  paid: PayoutStatAmount;
  failed: PayoutStatAmount;
  rejected: PayoutStatAmount;
  payable: { credits: number; usd: number; pendingCredits: number };
}

export interface PlanPerformance {
  plan: string;
  total: number;
  active: number;
  cancelled: number;
  revenue: number;
  retentionRate: number;
  cancellationRate: number;
}

export interface SubscriptionStats {
  totalUsers: number;
  totalRevenue: number;
  planDistribution: Array<{ _id: string; count: number }>;
  revenueByMonth: Array<{ month: number; total: number }>;
  subscribers?: { total: number; active: number; today: number; week: number; month: number };
  revenue?: { today: number; week: number; month: number; year: number; allTime: number };
  planPerformance?: {
    mostPopular?: PlanPerformance | null;
    highestRevenue?: PlanPerformance | null;
    highestRetention?: PlanPerformance | null;
    highestCancellation?: PlanPerformance | null;
  };
  plans?: PlanPerformance[];
  renewals?: { dueIn7: number; expired: number };
  growthByMonth?: Array<{ month: number; total: number; plans: Record<string, number> }>;
}
