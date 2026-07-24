import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stable CSS classes (defined in web styles) — avoid Tailwind-only tokens that may not be scanned. */
export const buttonVariants = {
  default: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  destructive: "btn btn-destructive",
} as const;

export const skeletonClass = "skeleton-block";
