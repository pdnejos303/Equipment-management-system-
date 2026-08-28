"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/useRole";
import { useCategories } from "@/lib/useCategories";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { CategoriesManagerDialog } from "@/components/settings/CategoriesManagerDialog";
import { Settings2 } from "lucide-react";

interface CategoryFilterProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  name?: string;
  allLabel?: string;
  hideAllOption?: boolean;
}

export function CategoryFilter({ 
  value, 
  onChange, 
  className = "flex-1 sm:w-56 sm:flex-none", 
  name = "category",
  allLabel,
  hideAllOption = false
}: CategoryFilterProps) {
  const { t } = useI18n();
  const { canCreate } = useRole();
  const { categories } = useCategories();
  const [showManage, setShowManage] = useState(false);

  const categoryOptions = categories.map((c) => ({
    value: c.key,
    label: c.label,
    prefix: c.emoji || undefined,
  }));

  const defaultAllLabel = t("assets.allCategory");

  return (
    <>
      <div className="flex gap-2 items-center flex-1 sm:flex-none">
        <SearchableSelect
          name={name}
          value={value}
          onChange={onChange}
          options={categoryOptions}
          allLabel={allLabel || defaultAllLabel}
          ariaLabel={allLabel || defaultAllLabel}
          className={className}
          hideAllOption={hideAllOption}
        />
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowManage(true)}
            className="flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-sm font-medium border border-border rounded-lg bg-surface hover:bg-surface-hover text-gray-300 hover:text-gray-100 transition-colors flex-shrink-0"
            title={t("assets.manageCategories")}
            aria-label={t("assets.manageCategories")}
          >
            <Settings2 size={14} />
            <span className="hidden sm:inline">{t("assets.manageCategories")}</span>
          </button>
        )}
      </div>
      <CategoriesManagerDialog
        open={showManage}
        onClose={() => setShowManage(false)}
      />
    </>
  );
}
