export type Role = "STUDENT" | "STAFF" | "ADMIN";

export type SessionUser = {
  userId: number;
  email: string;
  role: Role;
  authVersion: number;
  campusId?: number;
};

export type LostItemStatus = "OPEN" | "MATCHED" | "CLOSED";
