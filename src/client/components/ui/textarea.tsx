import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea className={cn("flex min-h-24 w-full resize-y rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10", className)} ref={ref} {...props} />
));
Textarea.displayName = "Textarea";
export { Textarea };
