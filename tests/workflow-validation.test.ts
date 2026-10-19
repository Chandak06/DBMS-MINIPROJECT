import { describe, it, expect } from "vitest";
import {
  foundItemCreateSchema,
  claimCreateSchema,
  matchReviewSchema,
  claimProcessSchema,
  profileUpdateSchema,
  itemDetailsSchema,
} from "@/lib/validations";
describe("workflow validation", () => {
  it("accepts a found report", () =>
    expect(
      foundItemCreateSchema.safeParse({
        itemName: "Wallet",
        foundDatetime: "2026-01-10T10:30:00+05:30",
        categoryId: 2,
        locationId: 1,
      }).success,
    ).toBe(true));
  it("rejects non-finite item attributes", () =>
    expect(
      itemDetailsSchema.safeParse({ extraAttributes: { weight: NaN } }).success,
    ).toBe(false));
  it("requires meaningful claim evidence", () =>
    expect(
      claimCreateSchema.safeParse({ foundId: 1, claimDescription: "mine" })
        .success,
    ).toBe(false));
  it("does not accept caller-supplied claim ownership", () =>
    expect(
      claimCreateSchema.safeParse({
        foundId: 1,
        claimDescription: "The serial number is 1234",
        submittedBy: 8,
      }).success,
    ).toBe(false));
  it("requires decision notes", () =>
    expect(
      matchReviewSchema.safeParse({ status: "ACCEPTED", remarks: "" }).success,
    ).toBe(false));
  it("rejects reopening a terminal claim", () =>
    expect(
      claimProcessSchema.safeParse({ status: "PENDING", remarks: "retry" })
        .success,
    ).toBe(false));
  it("prevents role escalation via profile changes", () =>
    expect(
      profileUpdateSchema.safeParse({
        firstName: "Demo",
        lastName: "Student",
        departmentId: 1,
        role: "ADMIN",
      }).success,
    ).toBe(false));
  it("rejects executable media URLs", () =>
    expect(
      itemDetailsSchema.safeParse({
        media: [{ url: "javascript:alert(1)", type: "image" }],
      }).success,
    ).toBe(false));
});
describe("calendar and timezone validation", () => {
  it("rejects impossible calendar dates", () =>
    expect(
      foundItemCreateSchema.safeParse({
        itemName: "Wallet",
        foundDatetime: "2026-02-30T10:30:00Z",
        categoryId: 2,
        locationId: 1,
      }).success,
    ).toBe(false));
  it("rejects ambiguous timezone-free dates", () =>
    expect(
      foundItemCreateSchema.safeParse({
        itemName: "Wallet",
        foundDatetime: "2026-01-10T10:30",
        categoryId: 2,
        locationId: 1,
      }).success,
    ).toBe(false));
});
