import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-accent-coral/10 text-accent-coral",
        outline: "border border-border text-foreground",
        ghost: "bg-brand-500/5 text-brand-700 dark:text-brand-300",
        link: "text-brand-600 underline-offset-4 hover:underline dark:text-brand-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  dot = false,
  children,
  render,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    dot?: boolean;
  }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: dot ? (
          <>
            <span data-slot="badge-dot" className="size-1.5 shrink-0 rounded-full bg-current" />
            {children}
          </>
        ) : (
          children
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
