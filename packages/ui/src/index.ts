import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const buttonVariants = {
  default:
    "inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border border-transparent",
  secondary:
    "inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-medium bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer",
  ghost:
    "inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer border border-transparent",
  destructive:
    "inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-semibold bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border border-transparent",
} as const;

export const skeletonClass = "animate-pulse rounded-md bg-muted";
