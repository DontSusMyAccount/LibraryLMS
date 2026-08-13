import { ConstructionIcon } from "lucide-react";

interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl bg-card text-center shadow-card">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300">
        <ConstructionIcon className="size-7" />
      </div>
      <h1 className="text-title font-semibold text-foreground">{title}</h1>
      <p className="max-w-sm text-body text-muted-foreground">{description}</p>
    </div>
  );
}
