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
