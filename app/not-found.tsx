import Link from "next/link";
export default function NotFound(){return <main className="container card stack"><h1>Page unavailable</h1><p>The requested record was not found or is outside your account.</p><Link className="button" href="/dashboard">Return to dashboard</Link></main>;}
