export type ToolCategory =
  | "Power Tools"
  | "Garden"
  | "Kitchen"
  | "Camping"
  | "Cleaning"
  | "Other";

export type ToolCondition = "New" | "Excellent" | "Good" | "Fair";

export type ToolAvailability = "Available" | "On loan" | "Reserved";

export interface ToolItem {
  id: string;
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  availability: ToolAvailability;
  description: string;
  imageUrl?: string;
  locationArea?: string; // e.g. "Maple Hill / 0.4 mi"
}

export interface BorrowRequestInput {
  toolId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface AddToolInput {
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  description: string;
  imageUrl?: string;
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
