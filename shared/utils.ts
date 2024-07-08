import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { keyBy as _keyBy, sortBy as _sortBy } from "lodash-es";
import { twMerge } from "tailwind-merge";
import { showToastPromise } from "./ui/toast";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function keyBy<T>(list: T[], key: keyof T) {
  return _keyBy(list, key);
}

export function sortBy<T>(list: T[], keys: Array<keyof T>) {
  return _sortBy(list, keys);
}

export function showToast(promise: Promise<any>) {
  showToastPromise(promise, {
    error: (e?: Error) => e?.message ?? "Error while saving data.",
    loading: "Saving...",
    success: () => "Saved data successfully.",
  });
}
