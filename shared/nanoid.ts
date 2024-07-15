import { customAlphabet } from "nanoid";
import { z } from "zod";

export const PUBLIC_ID_LENGTH = 12;
export const PUBLIC_ID_SCHEMA = z
  .string()
  .min(PUBLIC_ID_LENGTH)
  .max(PUBLIC_ID_LENGTH);

export const publicId = customAlphabet(
  "6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz",
  PUBLIC_ID_LENGTH,
);

// pb has a strict 15 character id length
export const POCKETBASE_ID_LENGTH = 15;
export const POCKETBASE_ID_SCHEMA = z
  .string()
  .min(POCKETBASE_ID_LENGTH)
  .max(POCKETBASE_ID_LENGTH);
export const pocketbaseId = customAlphabet(
  "6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz",
  POCKETBASE_ID_LENGTH,
);
