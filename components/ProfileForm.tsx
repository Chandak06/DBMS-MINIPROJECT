"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Department = { department_id: number; department_name: string; campus_name: string };
type User = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone: string | null;
  email: string;
  role: string;
  department_id: number;
};

export function ProfileForm({ user, departments }: { user: User; departments: Department[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(""); setError("");
    const f = new FormData(e.currentTarget);
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: f.get("firstName"), middleName: f.get("middleName"), lastName: f.get("lastName"),
        phone: f.get("phone"), departmentId: f.get("departmentId")
      })
    });
    const body = await response.json();
    if (!response.ok) return setError(body.error ?? "Update failed");
    setMessage("Profile updated");
    router.refresh();
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="form-grid">
        <label>First name<input name="firstName" defaultValue={user.first_name} required /></label>
        <label>Middle name<input name="middleName" defaultValue={user.middle_name ?? ""} /></label>
        <label>Last name<input name="lastName" defaultValue={user.last_name} required /></label>
        <label>Phone<input name="phone" defaultValue={user.phone ?? ""} /></label>
      </div>
      <label>Department<select name="departmentId" defaultValue={user.department_id} required>
        {departments.map((d) => <option value={d.department_id} key={d.department_id}>{d.department_name} - {d.campus_name}</option>)}
      </select></label>
      <div className="small muted">Email: {user.email} | Role: {user.role}. Email and role cannot be changed here.</div>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      <button className="button">Save profile</button>
    </form>
  );
}
