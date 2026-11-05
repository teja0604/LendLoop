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
