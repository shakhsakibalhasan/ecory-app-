import { useEffect, useRef } from "react";

type Handler = { priority: number; run: () => void };
const handlers: Handler[] = [];
export function registerAppBack(run: () => void, priority = 10) {
  const handler = { run, priority };
  handlers.push(handler);
  return () => {
    const index = handlers.indexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}
export function useAppBack(run: () => void, enabled = true, priority = 10) {
  const latest = useRef(run);
  latest.current = run;
  useEffect(
    () => (enabled ? registerAppBack(() => latest.current(), priority) : undefined),
    [enabled, priority],
  );
}
export function handleAppBack() {
  // Radix sheets/dialogs own Escape handling. Close overlays before leaving their page.
  if (
    typeof document !== "undefined" &&
    document.querySelector('[role="dialog"][data-state="open"]')
  ) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }),
    );
    return true;
  }
  const top = [...handlers]
    .reverse()
    .sort((a, b) => b.priority - a.priority)
    .at(0);
  if (!top) return false;
  top.run();
  return true;
}
