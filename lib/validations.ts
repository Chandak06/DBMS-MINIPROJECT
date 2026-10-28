import { z } from "zod";
import { normalizeLocalFormat } from "./college-email.mjs";
const optionalText = (max: number) => z.string().trim().max(max).optional().transform(v => v === "" ? undefined : v);
const attributes = z.record(z.string().min(1).max(60), z.union([z.string().max(300), z.number().finite(), z.boolean()])).refine(v => Object.keys(v).length <= 30, "At most 30 attributes");
export const itemDetailsSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  searchKeywords: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  media: z.array(z.object({
    url: z.string().url().refine(v => ["http:", "https:"].includes(new URL(v).protocol), "Use HTTP or HTTPS"),
    type: z.enum(["image", "document"]).default("image"), caption: optionalText(200)
  })).max(10).default([]),
  extraAttributes: attributes.default({})
});
export const lostItemDetailsSchema = itemDetailsSchema;
const base = z.object({
  itemName: z.string().trim().min(2).max(150), description: optionalText(3000),
  color: optionalText(60), brand: optionalText(100), remarks: optionalText(3000),
  categoryId: z.coerce.number().int().positive(), locationId: z.coerce.number().int().positive()
});
function validateDate(value: string | undefined, field: string, ctx: z.RefinementCtx) {
  if (value === undefined) return;
  const date = new Date(value);
  // Require a timezone: browsers submit ISO values; SQL stores UTC.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !z.string().datetime({offset:true}).safeParse(value).success || Number.isNaN(date.getTime()))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Use a valid date/time with timezone" });
  else if (date.getTime() > Date.now() + 60_000)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Date/time cannot be in the future" });
}
export const lostItemCreateSchema = base.merge(itemDetailsSchema).extend({ lostDatetime: z.string().min(1) }).superRefine((d,c) => validateDate(d.lostDatetime,"lostDatetime",c));
export const foundItemCreateSchema = base.merge(itemDetailsSchema).extend({ foundDatetime: z.string().min(1) }).superRefine((d,c) => validateDate(d.foundDatetime,"foundDatetime",c));
const detailPatch = z.object({
  tags:itemDetailsSchema.shape.tags.removeDefault().optional(),
  searchKeywords:itemDetailsSchema.shape.searchKeywords.removeDefault().optional(),
  media:itemDetailsSchema.shape.media.removeDefault().optional(),
  extraAttributes:itemDetailsSchema.shape.extraAttributes.removeDefault().optional()
});
export const lostItemUpdateSchema = base.partial().merge(detailPatch).extend({ lostDatetime: z.string().optional(), status: z.enum(["OPEN","CLOSED"]).optional() }).strict().superRefine((d,c) => validateDate(d.lostDatetime,"lostDatetime",c));
export const foundItemUpdateSchema = base.partial().merge(detailPatch).extend({ foundDatetime: z.string().optional(), status: z.enum(["OPEN","CLOSED"]).optional() }).strict().superRefine((d,c) => validateDate(d.foundDatetime,"foundDatetime",c));
export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(2).max(80), middleName: optionalText(80),
  lastName: z.string().trim().min(1).max(80), phone: optionalText(20),
  departmentId: z.coerce.number().int().positive()
}).strict();
const domain=z.string().trim().toLowerCase().min(4).max(190).regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);
const localFormat=z.string().trim().min(1).max(120).refine(v=>{try{normalizeLocalFormat(v);return true;}catch{return false;}},"Invalid email ID format").default("{id}");
const collegeFields={institutionCode:z.string().trim().toUpperCase().regex(/^[A-Z]{2,12}$/),studentDomain:domain,staffDomain:domain,adminDomain:domain,studentLocalFormat:localFormat,staffLocalFormat:localFormat,adminLocalFormat:localFormat};
export const collegeRegistrationSchema=z.object(collegeFields).strict().refine(d=>new Set([d.studentDomain,d.staffDomain,d.adminDomain]).size===3,"Use different email domains for each role");
export const campusCreateSchema = z.object({ campusName:z.string().trim().min(2).max(120), street:optionalText(150), city:optionalText(80), state:optionalText(80), postalCode:optionalText(20),...collegeFields }).strict().refine(d=>new Set([d.studentDomain,d.staffDomain,d.adminDomain]).size===3,"Use different email domains for each role");
export const departmentCreateSchema = z.object({ departmentName:z.string().trim().min(2).max(120), campusId:z.coerce.number().int().positive() });
export const categoryCreateSchema = z.object({ categoryName:z.string().trim().min(2).max(100), description:optionalText(3000) });
export const locationCreateSchema = z.object({ locationName:z.string().trim().min(2).max(150), campusId:z.coerce.number().int().positive(), building:optionalText(100), floor:optionalText(50), area:optionalText(100), type:optionalText(50) });
export const matchCreateSchema = z.object({ lostId:z.coerce.number().int().positive(), foundId:z.coerce.number().int().positive() }).strict();
export const matchGenerateSchema = z.object({ lostId:z.coerce.number().int().positive().optional() }).strict();
export const matchReviewSchema = z.object({ status:z.enum(["ACCEPTED","REJECTED"]), remarks:z.string().trim().min(3).max(3000) }).strict();
export const claimCreateSchema = z.object({ foundId:z.coerce.number().int().positive(), claimDescription:z.string().trim().min(10).max(3000), claimRemarks:optionalText(3000) }).strict();
export const claimProcessSchema = z.object({ status:z.enum(["APPROVED","REJECTED"]), remarks:z.string().trim().min(3).max(3000) }).strict();
export const userCreateSchema = z.object({
  firstName:z.string().trim().min(2).max(80), lastName:z.string().trim().min(1).max(80),
  email:z.string().trim().email().max(255).transform(v=>v.toLowerCase()),
  role:z.enum(["STUDENT","STAFF"]), departmentId:z.coerce.number().int().positive(),
  password:z.string().min(12).max(128).refine(v=>!v.includes("\0")&&Buffer.byteLength(v,"utf8")<=512,"Invalid password")
}).strict();

