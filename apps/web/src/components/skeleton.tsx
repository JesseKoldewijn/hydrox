/** @jsxImportSource octane */
import { cn, skeletonClass } from "@hydrox/ui";

export function SkeletonBlock(props: { class?: string }) {
  return <div class={cn(skeletonClass, "min-h-4", props.class)} />;
}
