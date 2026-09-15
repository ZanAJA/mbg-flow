export const ROLES = ["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"] as const;
export type Role = (typeof ROLES)[number];

export const PRODUCTION_STATUSES = [
  "DRAFT",
  "IN_PRODUCTION",
  "PARTIALLY_READY",
  "PRODUCTION_COMPLETE",
  "CLOSED",
] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const COMPONENT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "FINISHED"] as const;
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export const DELIVERY_STATUSES = ["PLANNED", "READY", "IN_DELIVERY", "RECEIVED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const SAFETY_STATUSES = ["SAFE", "WARNING", "PAST_LIMIT", "PENDING"] as const;
export type SafetyStatus = (typeof SAFETY_STATUSES)[number];

export const WARNING_THRESHOLD_MINUTES = 60;
export const DEFAULT_SAFE_WINDOW_MINUTES = 240;

export const TIMEZONE = "Asia/Jakarta";
export const SESSION_COOKIE = "mbg_session";
export const JWT_TTL_SECONDS = 60 * 60 * 12;
