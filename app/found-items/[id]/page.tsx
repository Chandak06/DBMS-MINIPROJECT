import { notFound } from "next/navigation";
import { ReportDetail } from "@/components/ReportPages";
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{sync?:string}>}) {const id=Number((await params).id);if(!Number.isSafeInteger(id)||id<=0)notFound();return <ReportDetail kind="found" id={id} sync={(await searchParams).sync}/>;}
