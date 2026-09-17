import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { buttonVariants } from "@/shared/components/ui/button";

export function ActionLink({
  href,
  children,
  className,
  variant = "outline",
  size = "sm",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
  size?: "sm" | "xs" | "default";
}) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}
