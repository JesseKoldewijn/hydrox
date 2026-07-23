import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const buttonVariants = {
  default:
    "inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer",
  secondary:
    "inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-medium bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer",
  ghost:
    "inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-medium hover:bg-muted transition-opacity disabled:opacity-50 cursor-pointer",
  destructive:
    "inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-semibold bg-destructive text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer",
} as const;

export const skeletonClass = "animate-pulse rounded-md bg-muted";
