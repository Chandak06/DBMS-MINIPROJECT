import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Campus Lost & Found",
  description: "Campus Lost & Found Intelligent Matching System"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return (
    <html lang="en">
      <body>
        {session && <Nav role={session.role} email={session.email} />}
        {children}
      </body>
    </html>
  );
}
