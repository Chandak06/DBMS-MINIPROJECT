import { apiError } from "./http";
import { safeDiagnostic } from "./diagnostics";
export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function handleError(error: unknown) {
  if (error instanceof AppError) return apiError(error.message, error.status);
  const e = (error??{}) as { code?: string; sqlState?: string; sqlMessage?: string; name?: string };
  if(e.code==="AUTH_BUSY")return apiError("Authentication is busy. Retry shortly.",429);
  if (e.sqlState === "45000") return apiError(e.sqlMessage ?? "Invalid state transition", 409);
  if (e.code === "ER_DUP_ENTRY") return apiError("This record already exists or conflicts with an active decision", 409);
  if (e.code === "ER_NO_REFERENCED_ROW_2") return apiError("Referenced record does not exist", 400);
  if (e.code === "ER_CHECK_CONSTRAINT_VIOLATED") return apiError("Database validation rejected the record", 400);
  if (["ECONNREFUSED", "ETIMEDOUT", "ER_ACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR"].includes(e.code ?? "")) {
    return apiError("Database unavailable. Check local database configuration.", 503);
  }
  if (["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(e.code ?? "")) return apiError("Another decision is in progress. Please retry.", 409);
  if (["MongoServerSelectionError", "MongoNetworkError"].includes(e.name ?? "")) return apiError("MongoDB unavailable. Retry when the database is running.", 503);
  console.error("Operation failed",safeDiagnostic(error));
  return apiError("Unable to complete the operation", 500);
}
export function positiveId(raw: string) {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw new AppError("Invalid record id");
  return id;
}

