import { useRef } from "react";
/** CSS handles Bengali digit substitution without scanning or mutating rendered text. */
export function useReadableText() {
  return useRef<HTMLDivElement>(null);
}
