import { notFound } from "next/navigation";
import { ReportEditor } from "@/components/ReportPages";
export default async function Page({params}:{params:Promise<{id:string}>}) {const id=Number((await params).id);if(!Number.isSafeInteger(id)||id<=0)notFound();return <ReportEditor kind="found" id={id}/>;}
