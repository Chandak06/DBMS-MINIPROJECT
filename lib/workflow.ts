import { AppError } from "./errors";

export const TRANSITIONS = {
  report: { OPEN: ["OPEN", "CLOSED"], MATCHED: [], CLOSED: [] },
  match: { PENDING: ["ACCEPTED", "REJECTED"], ACCEPTED: [], REJECTED: [] },
  claim: { PENDING: ["APPROVED", "REJECTED"], APPROVED: [], REJECTED: [] }
} as const;
export function requireTransition(kind: keyof typeof TRANSITIONS, from: string, to: string) {
  const transitions = TRANSITIONS[kind] as Record<string, readonly string[]>;
  if (!transitions[from]?.includes(to)) throw new AppError("Invalid " + kind + " state transition", 409);
}
