import { format } from "https://deno.land/std@0.92.0/datetime/mod.ts";

export function iso() {
  return format(new Date(), "yyyy-MM-dd");
}
