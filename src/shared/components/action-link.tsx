import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent } from "@/shared/components/ui/card";

export function ActionLink({
  href,
  children,
  className,
  label,
  variant = "icon",
}: {
  href: string;
  children?: React.ReactNode;
  className?: string;
  /** Accessible name for icon variant. */
  label?: string;
  variant?: "icon" | "text";
}) {
  const accessibleName =
    label ?? (typeof children === "string" ? children : "Buka detail");

  if (variant === "text") {
    return (
      <Link
        href={href}
        className={cn(
          "font-medium text-foreground transition-colors hover:text-primary hover:underline",
          className,
        )}
      >
        {children ?? accessibleName}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label={accessibleName}
      title={accessibleName}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <ChevronRight className="size-4" aria-hidden />
      <span className="sr-only">{accessibleName}</span>
    </Link>
  );
}

/** Full-card link with chevron affordance on the right. */
export function NavCard({
  href,
  label,
  children,
  className,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} aria-label={label} className={cn("block", className)}>
      <Card size="default" className="transition-colors hover:bg-muted/40">
        <CardContent className="flex items-center gap-3">
          <div className="min-w-0 flex-1">{children}</div>
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
            aria-hidden
          >
            <ChevronRight className="size-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
