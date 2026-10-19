"use client";
export default function ErrorPage({reset}:{error:Error;reset:()=>void}) {
 return <main className="container card stack"><h1>The page could not load</h1><p>Check that MySQL and MongoDB are running, then try again.</p><button className="button" onClick={reset}>Try again</button></main>;
}
