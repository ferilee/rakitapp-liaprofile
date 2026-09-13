import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => (
  <input type={type} className={cn("flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10", className)} ref={ref} {...props} />
));
Input.displayName = "Input";
export { Input };
