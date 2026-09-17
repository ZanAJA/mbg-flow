import { Button } from "@/shared/components/ui/button";

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function QueryState({
  isLoading,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat data operasional...</p>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="font-medium text-destructive">Gagal memuat</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        {onRetry ? (
          <Button className="mt-3" variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        ) : null}
      </div>
    );
  }
  return children;
}
