import { ReportList,type PageQuery } from "@/components/ReportPages";
export default function Page({searchParams}:{searchParams:Promise<PageQuery>}) {return <ReportList kind="lost" searchParams={searchParams}/>;}
