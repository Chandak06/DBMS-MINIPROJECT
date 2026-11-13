import type { PoolConnection } from "mysql2/promise";
import type { Db } from "mongodb";
export interface SyncResult { processed: number; busy: boolean; pending: number; failed: number; retryable: number }
export function replayOutbox(connection: PoolConnection, getDb: () => Promise<Db>, limit?: number): Promise<SyncResult>;
export function outboxHealth(connection: PoolConnection): Promise<{pending:number;failed:number;retryable:number}>;
export function diagnostic(error: unknown): string;
export function classifyFailure(error: unknown, attempts: number): string;
export function retryDelay(attempts: number): number;
export function utcDate(value: unknown): Date;
export const MAX_ATTEMPTS: number;
