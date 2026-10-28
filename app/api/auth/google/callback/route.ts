import {NextResponse} from "next/server";
export function GET(){return NextResponse.json({error:"Google sign-in has been removed. Use your college email and password."},{status:410});}
