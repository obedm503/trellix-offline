import PocketBase from "pocketbase";

if (!import.meta.env.VITE_POCKETBASE_URL) {
  throw new Error("VITE_POCKETBASE_URL not defined");
}

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
