import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useAppBack } from "@/lib/app-back";
const positions = new Map<string, { top: number; trigger: HTMLElement | null }>();
export function rememberAdminEditor(event: React.MouseEvent<HTMLElement>) {
  const target = event.target as Element;
  const button = target.closest<HTMLElement>(".admin-edit-button,[data-admin-open]");
  if (!button) return;
  const scope = event.currentTarget.getAttribute("data-admin-scope") || "admin";
  positions.set(scope, { top: window.scrollY, trigger: button });
}
/** An inline detail view, never a modal or a body portal. */
export function AdminEditor({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useAppBack(onBack, true, 30);
  useLayoutEffect(() => {
    const scope =
      heading.current?.closest("[data-admin-scope]")?.getAttribute("data-admin-scope") || "admin";
    const previous = positions.get(scope);
    heading.current?.focus({ preventScroll: true });
    const rect = heading.current?.getBoundingClientRect();
    if (rect && (rect.top < 12 || rect.top > window.innerHeight * 0.55))
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    return () => {
      requestAnimationFrame(() => {
        if (
          document.querySelector("[data-admin-scope]")?.getAttribute("data-admin-scope") !==
            scope ||
          !previous
        )
          return;
        window.scrollTo({ top: previous.top, behavior: "instant" });
        if (previous.trigger?.isConnected) previous.trigger.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <section className="admin-editor" aria-labelledby={id}>
      <header className="admin-editor-heading">
        <button
          type="button"
          onClick={onBack}
          className="admin-editor-back"
          aria-label="তালিকায় ফিরে যান"
        >
          <ChevronLeft size={17} />
        </button>
        <h3 ref={heading} id={id} tabIndex={-1}>
          {title}
        </h3>
        <span className="admin-editor-mode">তথ্য সম্পাদনা</span>
      </header>
      <div className="admin-editor-fields">{children}</div>
    </section>
  );
}
