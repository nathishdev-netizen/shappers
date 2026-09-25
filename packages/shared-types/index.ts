export enum StaffRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  STAFF = "STAFF",
  TRAINER = "TRAINER",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  CANCELLED = "CANCELLED",
  FROZEN = "FROZEN",
}

export enum AttendanceSource {
  QR = "QR",
  RFID = "RFID",
  BIOMETRIC = "BIOMETRIC",
  MANUAL = "MANUAL",
}

export interface TenantDto {
  id: string;
  name: string;
  subdomain: string;
}

export interface MemberDto {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipPlanId?: string;
  subscriptionStatus?: SubscriptionStatus;
}

export interface AttendanceEventDto {
  id: string;
  tenantId: string;
  memberId: string;
  source: AttendanceSource;
  checkedInAt: string;
}
