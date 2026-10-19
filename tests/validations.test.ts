import { describe, expect, it } from "vitest";
import { lostItemCreateSchema, lostItemUpdateSchema, profileUpdateSchema } from "@/lib/validations";

describe("profile validation", () => {
  it("accepts a valid profile update", () => {
    const result = profileUpdateSchema.safeParse({
      firstName: "Asha",
      middleName: "",
      lastName: "Rao",
      phone: "9999999999",
      departmentId: 1
    });
    expect(result.success).toBe(true);
  });
});

describe("lost item validation", () => {
  it("accepts valid lost item data", () => {
    const result = lostItemCreateSchema.safeParse({
      itemName: "Black wallet",
      description: "Leather wallet with ID slot",
      lostDatetime: "2026-01-10T10:30:00+05:30",
      color: "Black",
      brand: "Generic",
      remarks: "",
      categoryId: 2,
      locationId: 1,
      tags: ["wallet", "black"],
      searchKeywords: ["id slot"],
      extraAttributes: { material: "leather" }
    });
    expect(result.success).toBe(true);
  });

  it("rejects a future lost date", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = lostItemCreateSchema.safeParse({
      itemName: "Laptop",
      lostDatetime: future,
      categoryId: 1,
      locationId: 1
    });
    expect(result.success).toBe(false);
  });

  it("does not allow a student update payload to set MATCHED", () => {
    const result = lostItemUpdateSchema.safeParse({ status: "MATCHED" });
    expect(result.success).toBe(false);
  });

  it("allows a student to close an OPEN report", () => {
    const result = lostItemUpdateSchema.safeParse({ status: "CLOSED" });
    expect(result.success).toBe(true);
  });
});

