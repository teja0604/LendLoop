import {
  GenericId,
  GenericDataModel,
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";

export type Id<TableName extends string> = GenericId<TableName>;

export type UserRole = "user" | "admin";

export interface UserDoc {
  _id: Id<"users">;
  _creationTime: number;
  clerkUserId: string;
  displayName: string;
  role: UserRole;
  isTrustedLender: boolean;
  createdAt: number;
}

export interface DataModel extends GenericDataModel {
  users: {
    document: UserDoc;
    fieldPaths:
      | "_id"
      | "_creationTime"
      | "clerkUserId"
      | "displayName"
      | "role"
      | "isTrustedLender"
      | "createdAt";
    indexes: {
      by_clerk_id: ["clerkUserId"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
}

export type Doc<TableName extends keyof DataModel> = DataModel[TableName]["document"];

