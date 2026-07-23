import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const buttonVariants = {
  default:
    "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-opacity disabled:opacity-50",
  secondary:
    "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity disabled:opacity-50",
  ghost:
    "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium hover:bg-muted transition-opacity disabled:opacity-50",
  destructive:
    "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium bg-destructive text-white hover:opacity-90 transition-opacity disabled:opacity-50",
} as const;

export const skeletonClass = "animate-pulse rounded-md bg-muted";
