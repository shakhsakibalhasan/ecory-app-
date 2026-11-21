import { useEffect, useState, type ReactNode } from "react";
import { useBranding } from "@/lib/branding";
import { usePresentation } from "@/lib/presentation";
import { useBanners, useCategories, useProducts, useSettings } from "@/lib/store";

/** Verify this launch's visual configuration before revealing the storefront. */
export function AppStartup({ children }: { children: ReactNode }) {
  const branding = useBranding(),
    presentation = usePresentation();
  const banners = useBanners(),
    categories = useCategories(),
    settings = useSettings();
  useProducts(); // Start the catalogue request in parallel, not after the animation.
  const [deadline, setDeadline] = useState(false);
  const [done, setDone] = useState(false);
  const settled = [branding, presentation, banners, categories, settings].every(
    (q) => !q.isLoading,
  );
  const ready = settled || deadline;
  useEffect(() => {
    const timer = setTimeout(() => setDeadline(true), 6000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setDone(true), reduced ? 0 : 1000);
    return () => clearTimeout(timer);
  }, [ready]);
  if (done) return <>{children}</>;
  return (
    <div className="ecory-startup" role="status" aria-label="Ecory লোড হচ্ছে">
      <svg
        viewBox="0 0 256 256"
        className={`ecory-startup-icon ${ready ? "ecory-startup-ready" : ""}`}
        aria-hidden="true"
      >
        <defs>
          {/* Extract the supplied white leaf at render time. The uploaded PNG stays untouched. */}
          <filter
            id="ecory-leaf-cutout"
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1.1 0 -0.1"
              result="leaf"
            />
            <feComposite in="leaf" in2="SourceAlpha" operator="in" result="shape" />
            <feFlood floodColor="var(--primary)" result="colour" />
            <feComposite in="colour" in2="shape" operator="in" />
          </filter>
          <clipPath id="ecory-startup-circle">
            <circle cx="128" cy="128" r="112" />
          </clipPath>
        </defs>
        <circle cx="128" cy="128" r="113" fill="none" stroke="var(--primary)" strokeWidth="3" />
        <g clipPath="url(#ecory-startup-circle)">
          <image
            href="/ecory-startup-icon.png"
            x="0"
            y="0"
            width="256"
            height="256"
            filter="url(#ecory-leaf-cutout)"
            className="ecory-startup-leaf"
          />
        </g>
      </svg>
    </div>
  );
}
