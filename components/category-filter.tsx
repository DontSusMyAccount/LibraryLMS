"use client";

import { useMemo } from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/app/features/catalog/catalog.types";

interface CategoryOption {
  id: string;
  name: string;
  depth: number;
}

function flattenCategoryOptions(nodes: CategoryNode[], depth = 0): CategoryOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...(node.children ? flattenCategoryOptions(node.children, depth + 1) : []),
  ]);
}

export { flattenCategoryOptions };
export type { CategoryOption };

interface CategoryFilterProps {
  categories: CategoryNode[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  className?: string;
}

function CategoryFilter({ categories, value, onChange, className }: CategoryFilterProps) {
  const options = useMemo(() => flattenCategoryOptions(categories), [categories]);

  const handleChange = (nextValue: string) => {
    onChange(nextValue ? nextValue : null);
  };

  return (
    <div className={cn("relative", className)}>
      <select
        data-slot="category-filter"
        value={value ?? ""}
        onChange={(event) => handleChange(event.target.value)}
        aria-label="กรองหมวดหมู่"
        className="h-[42px] w-full min-w-0 appearance-none rounded-sm border border-input bg-card py-2 pr-9 pl-3.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 dark:bg-input/30"
      >
        <option value="">ทุกหมวดหมู่</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {`${"\u00A0".repeat(option.depth * 2)}${option.name}`}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { CategoryFilter };

export type { CategoryFilterProps };
