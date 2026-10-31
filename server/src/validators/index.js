// Request schemas belong here. Add strict Zod schemas for every write endpoint before production exposure.
export const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;
