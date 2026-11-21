import { UploadedIcon } from "@/lib/presentation";
import { EditableIcon } from "@/lib/presentation";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCategories, type Lang } from "@/lib/store";
import { CATEGORY_ICONS } from "@/lib/catalog";
export function CategoryRail({
  lang,
  active,
  onSelect,
  excludeOffers = true,
}: {
  lang: Lang;
  active?: string | null;
  onSelect?: (key: string) => void;
  excludeOffers?: boolean;
}) {
  const { data: cats = [] } = useCategories();
  const [expanded, setExpanded] = useState(false);
  const categories = excludeOffers ? cats.filter(c => !/offer|অফার/i.test(`${c.key} ${c.bn} ${c.en}`)) : cats;
  const visible = expanded ? categories : categories.slice(0, 4);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {visible.map((c) => {
          const body = (
            <>
              <span className="min-w-0 flex-1 text-left text-xs font-bold">{c[lang]}</span>
              <UploadedIcon src={c.icon || undefined} className="h-9 w-9 shrink-0"><img src={CATEGORY_ICONS[c.key]} alt="" className="h-9 w-9 shrink-0 object-contain" /></UploadedIcon>
            </>
          );
          const cls = `ecory-category-tile flex min-h-16 items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${active === c.key ? "border-primary bg-primary text-ink" : "border-transparent bg-[#ECEDE9] text-foreground"}`;
          return onSelect ? (
            <button key={c.key} type="button" aria-pressed={active === c.key} onClick={() => onSelect(c.key)} className={cls}>
              {body}
            </button>
          ) : (
            <Link key={c.key} to="/products" search={{ category: c.key }} className={cls}>
              {body}
            </Link>
          );
        })}
      </div>
      {categories.length > 4 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mx-auto mt-3 flex items-center gap-2 rounded-lg border bg-white px-5 py-2 text-xs font-bold"
        >
          {lang === "bn"
            ? expanded
              ? "কম দেখুন"
              : "আরও দেখুন"
            : expanded
              ? "See less"
              : "See more"}
          {expanded ? <EditableIcon name="icon_chevron_up"><ChevronUp size={14} /></EditableIcon> : <EditableIcon name="icon_chevron_down"><ChevronDown size={14} /></EditableIcon>}
        </button>
      )}
    </div>
  );
}
