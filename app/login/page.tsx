import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { demoLoginEnabled } from "@/lib/demo-auth";
export default async function Page({searchParams}:{searchParams:Promise<{error?:string}>}) {if(await getSession())redirect("/dashboard");return <main className="auth-shell"><LoginForm errorCode={(await searchParams).error} demoEnabled={demoLoginEnabled()}/></main>;}
