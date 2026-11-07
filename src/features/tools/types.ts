import { Id, Doc } from "../../../convex/_generated/dataModel";

export type ToolCategory =
  | "Power Tools"
  | "Garden"
  | "Kitchen"
  | "Camping"
  | "Cleaning"
  | "Other";

export type ToolCondition = "New" | "Excellent" | "Good" | "Fair";

export type ToolAvailability = "Available" | "On loan" | "Reserved";

export type RequestStatus = "pending" | "approved" | "declined";

export type LoanStatus = "active" | "returned";

export interface PublicToolItem {
  _id: Id<"tools">;
  name: string;
  category: ToolCategory;
}

export type MyToolItem = Doc<"tools">;

export interface ToolItem {
  id: string;
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  availability: ToolAvailability;
  description: string;
  imageUrl?: string;
  locationArea?: string;
}

export interface AddToolInput {
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  description: string;
}

export interface UpdateToolInput {
  toolId: Id<"tools">;
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  description: string;
}

export interface BorrowRequestWithDetails {
  _id: Id<"borrowRequests">;
  toolId: Id<"tools">;
  lenderId: Id<"users">;
  borrowerId: Id<"users">;
  startDate: string;
  endDate: string;
  status: RequestStatus;
  createdAt: number;
  updatedAt: number;
  tool: {
    _id: Id<"tools">;
    name: string;
    category: ToolCategory;
    condition: ToolCondition;
    isActive: boolean;
  } | null;
  lender?: {
    displayName: string;
    isTrustedLender: boolean;
  } | null;
  borrower?: {
    displayName: string;
  } | null;
}

export interface LoanWithDetails {
  _id: Id<"loans">;
  requestId: Id<"borrowRequests">;
  toolId: Id<"tools">;
  lenderId: Id<"users">;
  borrowerId: Id<"users">;
  startDate: string;
  dueDate: string;
  status: LoanStatus;
  returnedAt?: number;
  createdAt: number;
  role: "lender" | "borrower";
  isOverdue: boolean;
  tool: {
    _id: Id<"tools">;
    name: string;
    category: ToolCategory;
    condition: ToolCondition;
    isActive: boolean;
  } | null;
  otherParticipant: {
    displayName: string;
    isTrustedLender?: boolean;
  } | null;
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  "Power Tools",
  "Garden",
  "Kitchen",
  "Camping",
  "Cleaning",
  "Other",
];

export const TOOL_CONDITIONS: ToolCondition[] = [
  "New",
  "Excellent",
  "Good",
  "Fair",
];

export const TOOL_AVAILABILITIES: ToolAvailability[] = [
  "Available",
  "On loan",
  "Reserved",
];

export interface AdminPlatformStats {
  totalUsers: number;
  trustedLendersCount: number;
  totalTools: number;
  activeToolsCount: number;
  inactiveToolsCount: number;
  totalLoans: number;
  activeLoansCount: number;
  overdueLoansCount: number;
  returnedLoansCount: number;
  totalRequests: number;
  pendingRequestsCount: number;
  approvedRequestsCount: number;
  declinedRequestsCount: number;
}

export interface AdminUserItem {
  _id: Id<"users">;
  clerkUserId: string;
  displayName: string;
  role: "user" | "admin";
  isTrustedLender: boolean;
  createdAt: number;
  toolsCount: number;
  activeToolsCount: number;
  activeLoansAsLenderCount: number;
  activeLoansAsBorrowerCount: number;
}

export interface AdminLoanItem {
  _id: Id<"loans">;
  requestId: Id<"borrowRequests">;
  startDate: string;
  dueDate: string;
  status: LoanStatus;
  returnedAt?: number;
  createdAt: number;
  isOverdue: boolean;
  tool: {
    _id: Id<"tools">;
    name: string;
    category: ToolCategory;
    condition: ToolCondition;
    isActive: boolean;
  } | null;
  lender: {
    _id: Id<"users">;
    displayName: string;
    isTrustedLender: boolean;
    clerkUserId: string;
  } | null;
  borrower: {
    _id: Id<"users">;
    displayName: string;
    isTrustedLender: boolean;
    clerkUserId: string;
  } | null;
}

export interface AdminToolItem {
  _id: Id<"tools">;
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  description: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  owner: {
    _id: Id<"users">;
    displayName: string;
    isTrustedLender: boolean;
    clerkUserId: string;
  } | null;
  totalLoansCount: number;
  hasActiveLoan: boolean;
}

export interface AdminAutomationOverview {
  counts: {
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    total: number;
  };
  recentActivities: {
    _id: Id<"automationActivity">;
    idempotencyKey: string;
    eventType: string;
    result: "sent" | "failed";
    summary: string;
    createdAt: number;
  }[];
  recentOutbox: {
    _id: Id<"automationOutbox">;
    eventId: string;
    eventType: string;
    status: "pending" | "processing" | "sent" | "failed";
    attempts: number;
    lastError: string | null;
    createdAt: number;
  }[];
}

