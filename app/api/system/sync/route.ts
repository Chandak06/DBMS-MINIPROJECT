import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { requireStaff } from "@/lib/match-service";
import { flushMongoOutbox } from "@/lib/outbox";
export async function POST() { return withUser(async user=>{requireStaff(user);return NextResponse.json(await flushMongoOutbox(1000));}); }
