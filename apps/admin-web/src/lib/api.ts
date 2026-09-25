const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export interface AuthUser {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface TenantDto {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  colors: { primary?: string; secondary?: string } | null;
}

export interface MembershipPlanDto {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingCycle: string;
}

export interface PaymentDto {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  method: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface SubscriptionDto {
  id: string;
  status: string;
  startDate: string;
  currentPeriodEnd: string;
  membershipPlan: MembershipPlanDto;
  member?: MemberDto;
  payments?: PaymentDto[];
}

export interface StaffDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface EnrolMembership {
  membershipPlanId: string;
  startDate?: string;
  durationDays?: number;
  totalFeeCents?: number;
  amountPaidCents?: number;
  paymentMethod?: string;
  balanceDueAt?: string;
}

export interface NewMemberPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  occupation?: string;
  preferredContact?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  idProofType?: string;
  idProofLast4?: string;
  emergencyName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
  medicalConditions?: string;
  allergies?: string;
  medications?: string;
  injuries?: string;
  physicianClearance?: boolean;
  parqCompleted?: boolean;
  waiverSigned?: boolean;
  primaryGoal?: string;
  experienceLevel?: string;
  heightCm?: number;
  assignedTrainerId?: string;
  accessCardNumber?: string;
  notes?: string;
  membership?: EnrolMembership;
}

export type ChurnRisk = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export type AccessReason =
  | "ACTIVE"
  | "NO_SUBSCRIPTION"
  | "EXPIRED"
  | "PAST_DUE"
  | "CANCELLED"
  | "FROZEN"
  | "MANUALLY_BLOCKED";

export interface AccessStatus {
  allowed: boolean;
  reason: AccessReason;
  daysRemaining: number | null;
  validUntil: string | null;
  frozenUntil: string | null;
}

export interface VisitStats {
  lastVisitAt: string | null;
  daysSinceLastVisit: number | null;
  visitsLast30: number;
  visitsPrev30: number;
  trendPercent: number | null;
  usualHour: number | null;
}

export interface TimelineEvent {
  id: string;
  at: string;
  kind: "JOINED" | "PAYMENT" | "FREEZE" | "PLAN_START" | "EXPIRY";
  title: string;
  detail?: string;
  status?: "good" | "warning" | "critical" | "neutral";
  amountCents?: number;
}

export interface MeasurementDto {
  id: string;
  recordedAt: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armCm: number | null;
  thighCm: number | null;
}

export interface MemberNoteDto {
  id: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string } | null;
}

export interface MemberDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  alternatePhone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  occupation: string | null;
  preferredContact: string;
  photoUrl: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  idProofType: string | null;
  idProofLast4: string | null;
  emergencyName: string | null;
  emergencyRelationship: string | null;
  emergencyPhone: string | null;
  medicalConditions: string | null;
  allergies: string | null;
  medications: string | null;
  injuries: string | null;
  physicianClearance: boolean;
  parqCompletedAt: string | null;
  waiverSignedAt: string | null;
  primaryGoal: string | null;
  experienceLevel: string | null;
  heightCm: number | null;
  accessCardNumber: string | null;
  accessBlocked: boolean;
  createdAt: string;
  subscriptions: SubscriptionDto[];
  assignedTrainer: { id: string; firstName: string; lastName: string } | null;
  branch: { id: string; name: string } | null;
  access: AccessStatus;
  visits: VisitStats;
  churnRisk: ChurnRisk;
}

export interface PaymentSummaryDto {
  planName: string | null;
  planPriceCents: number | null;
  billingCycle: string | null;
  totalBilledCents: number;
  paidCents: number;
  outstandingCents: number;
  paidRatio: number;
  nextDueAt: string | null;
  lastPaidAt: string | null;
  instalments: number;
}

export interface StaffDetailDto extends StaffMemberDto {
  clients: (MemberDto & { primaryGoal: string | null })[];
  sessions: (PtSessionDto & { member: { id: string; firstName: string; lastName: string } })[];
  dietPlans: DietPlanDto[];
  packages: (PtPackageDto & { used: number; remaining: number })[];
  stats: {
    clients: number;
    openLeads: number;
    sessionsUpcoming: number;
    sessionsThisWeek: number;
    sessionsCompleted: number;
    noShows: number;
    activeDietPlans: number;
  };
}

export interface MemberDetailDto extends MemberDto {
  outstandingCents: number;
  paymentSummary: PaymentSummaryDto;
  bmi: number | null;
  latestMeasurement: MeasurementDto | null;
  measurements: MeasurementDto[];
  memberNotes: MemberNoteDto[];
  attendanceEvents: { id: string; source: string; checkedInAt: string }[];
  ptSummary: { purchased: number; used: number; scheduled: number; remaining: number };
  ptPackages: {
    id: string;
    sessionsPurchased: number;
    trainer: { firstName: string; lastName: string } | null;
    sessions: { id: string; scheduledAt: string; status: string; focus: string | null; completedAt: string | null; notes: string | null }[];
  }[];
  upcomingSessions: { id: string; scheduledAt: string; status: string; focus: string | null }[];
  activeDietPlan: DietPlanDto | null;
  dietPlans: DietPlanDto[];
  branch: { id: string; name: string } | null;
  timeline: TimelineEvent[];
}

export interface AttendanceEventDto {
  id: string;
  source: string;
  checkedInAt: string;
  member: { firstName: string; lastName: string };
}

export interface AnalyticsOverview {
  totals: {
    members: number;
    activeSubscriptions: number;
    overdueSubscriptions: number;
    checkedInToday: number;
    mrrCents: number;
    trainersAvailable: number;
    classesToday: number;
    openLeads: number;
    sessionsToday: number;
    outstandingCents: number;
    outstandingInvoices: number;
  };
  attendanceTrend: { date: string; checkIns: number }[];
  revenueByMonth: { month: string; amountCents: number }[];
  registrations: { date: string; count: number }[];
  expiringSoon: {
    id: string;
    currentPeriodEnd: string;
    member: { id: string; firstName: string; lastName: string; phone: string | null };
    membershipPlan: { name: string; priceCents: number };
  }[];
  sessionsToday: {
    id: string;
    scheduledAt: string;
    focus: string | null;
    member: { firstName: string; lastName: string };
    trainer: { firstName: string; lastName: string } | null;
  }[];
  planDistribution: { name: string; count: number }[];
}

export interface BranchDto {
  id: string;
  name: string;
  code: string | null;
  addressLine: string | null;
  city: string | null;
  phone: string | null;
  openingHours: string | null;
  isActive: boolean;
  checkInsToday: number;
  _count: { members: number; users: number; classes: number; leads: number };
}

export interface StaffMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string | null;
  specialty: string | null;
  isActive: boolean;
  createdAt: string;
  branch: { id: string; name: string } | null;
  assignedClients: number;
  activeDietPlans: number;
  sessionsThisWeek: number;
}

export type LeadStatus = "NEW" | "CONTACTED" | "TRIAL" | "CONVERTED" | "LOST";

export interface LeadDto {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  followUpAt: string | null;
  createdAt: string;
  interestedPlan: { id: string; name: string; priceCents: number } | null;
  assignedTrainer: { id: string; firstName: string; lastName: string } | null;
  branch: { id: string; name: string } | null;
}

export interface PtSessionDto {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  focus: string | null;
  notes: string | null;
  member: { id: string; firstName: string; lastName: string };
  trainer: { id: string; firstName: string; lastName: string } | null;
  package: { id: string; sessionsPurchased: number };
}

export interface PtPackageDto {
  id: string;
  sessionsPurchased: number;
  priceCents: number;
  purchasedAt: string;
  expiresAt: string | null;
  used: number;
  scheduled: number;
  remaining: number;
  member: { id: string; firstName: string; lastName: string };
  trainer: { id: string; firstName: string; lastName: string } | null;
}

export interface Meal {
  time: string;
  name: string;
  items: string[];
  calories?: number;
}

export interface DietPlanDto {
  id: string;
  title: string;
  goal: string;
  dailyCalories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  meals: Meal[];
  notes: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  member?: { id: string; firstName: string; lastName: string; primaryGoal: string | null };
  trainer: { id: string; firstName: string; lastName: string } | null;
}

export interface InvoiceRowDto {
  id: string;
  amountCents: number;
  status: string;
  method: string | null;
  invoiceNumber: string | null;
  note: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  subscription: {
    membershipPlan: { name: string };
    member: { id: string; firstName: string; lastName: string; phone: string | null };
  };
}

export interface GymClassDto {
  id: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  booked: number;
  spotsLeft: number;
  branch: { id: string; name: string } | null;
  trainer: { id: string; firstName: string; lastName: string } | null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("shappers_token");
}

export function setToken(token: string) {
  window.localStorage.setItem("shappers_token", token);
}

export function clearToken() {
  window.localStorage.removeItem("shappers_token");
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // An expired or revoked session must never leave a screen silently empty:
  // drop the token and send the user back to sign in, wherever they were.
  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    window.localStorage.removeItem("shappers_user");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login?expired=1");
    }
    throw new ApiError("Session expired", 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(body.message ?? "Request failed", res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  login: (subdomain: string, email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ subdomain, email, password }),
    }),

  getMyTenant: () => request<TenantDto>("/tenants/me"),

  updateBranding: (data: { name?: string; primaryColor?: string; secondaryColor?: string }) =>
    request<TenantDto>("/tenants/me/branding", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getAnalytics: () => request<AnalyticsOverview>("/analytics/overview"),

  getMembers: () => request<MemberDto[]>("/members"),

  getMember: (id: string) => request<MemberDetailDto>(`/members/${id}`),

  addNote: (id: string, body: string, pinned = false) =>
    request<MemberNoteDto>(`/members/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ body, pinned }),
    }),

  getDuesOverview: () => request<SubscriptionDto[]>("/members/dues/overview"),

  getTodayAttendance: () => request<AttendanceEventDto[]>("/attendance/today"),

  getPlans: () => request<MembershipPlanDto[]>("/membership-plans"),
  createPlan: (data: { name: string; description?: string; priceCents: number; billingCycle: string; currency?: string }) =>
    request<MembershipPlanDto>("/membership-plans", { method: "POST", body: JSON.stringify(data) }),

  getStaff: () => request<StaffDto[]>("/tenants/me/staff"),

  // Branches
  getBranches: () => request<BranchDto[]>("/branches"),
  createBranch: (data: Partial<BranchDto> & { name: string }) =>
    request<BranchDto>("/branches", { method: "POST", body: JSON.stringify(data) }),

  // Staff
  listStaff: () => request<StaffMemberDto[]>("/staff"),
  getStaffMember: (id: string) => request<StaffDetailDto>(`/staff/${id}`),
  createStaff: (data: { firstName: string; lastName: string; email: string; password: string; role: string; phone?: string; specialty?: string; branchId?: string }) =>
    request<StaffMemberDto>("/staff", { method: "POST", body: JSON.stringify(data) }),
  updateStaff: (id: string, data: Partial<{ role: string; isActive: boolean; specialty: string; branchId: string | null }>) =>
    request<StaffMemberDto>(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Leads
  getLeads: () => request<{ leads: LeadDto[]; funnel: { status: LeadStatus; count: number }[] }>("/leads"),
  createLead: (data: { firstName: string; lastName: string; phone: string; email?: string; source?: string; interestedPlanId?: string; assignedTrainerId?: string; branchId?: string; notes?: string; followUpAt?: string }) =>
    request<LeadDto>("/leads", { method: "POST", body: JSON.stringify(data) }),
  updateLead: (id: string, data: { status?: LeadStatus; assignedTrainerId?: string | null; notes?: string; followUpAt?: string | null }) =>
    request<LeadDto>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Personal training
  getPtSessions: (params?: { from?: string; to?: string; trainerId?: string }) => {
    const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][]);
    return request<PtSessionDto[]>(`/pt/sessions${qs.toString() ? `?${qs}` : ""}`);
  },
  getPtPackages: () => request<PtPackageDto[]>("/pt/packages"),
  createPtPackage: (data: { memberId: string; trainerId?: string; sessionsPurchased: number; priceCents: number; expiresAt?: string }) =>
    request<PtPackageDto>("/pt/packages", { method: "POST", body: JSON.stringify(data) }),
  scheduleSession: (data: { packageId: string; scheduledAt: string; durationMinutes?: number; trainerId?: string; focus?: string }) =>
    request<PtSessionDto>("/pt/sessions", { method: "POST", body: JSON.stringify(data) }),
  updateSession: (id: string, data: { status?: PtSessionDto["status"]; notes?: string; scheduledAt?: string }) =>
    request<PtSessionDto>(`/pt/sessions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Diet
  getDietPlans: () => request<DietPlanDto[]>("/diet-plans"),
  getMemberDietPlans: (memberId: string) => request<DietPlanDto[]>(`/diet-plans/member/${memberId}`),
  createDietPlan: (data: { memberId: string; trainerId?: string; title: string; goal?: string; dailyCalories?: number; proteinG?: number; carbsG?: number; fatG?: number; meals: Meal[]; notes?: string }) =>
    request<DietPlanDto>("/diet-plans", { method: "POST", body: JSON.stringify(data) }),

  // Payments / invoices
  getInvoices: (status?: string) => request<InvoiceRowDto[]>(`/payments${status ? `?status=${status}` : ""}`),
  recordPayment: (data: { memberId: string; amountCents: number; method: string; note?: string }) =>
    request<{ invoiceNumber: string; balanceCleared: boolean }>("/payments", { method: "POST", body: JSON.stringify(data) }),


  createMember: (data: NewMemberPayload) =>
    request<MemberDto>("/members", { method: "POST", body: JSON.stringify(data) }),

  checkIn: (memberId: string) =>
    request<AttendanceEventDto>("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({ memberId, source: "MANUAL" }),
    }),
};
