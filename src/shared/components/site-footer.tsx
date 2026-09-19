import { Award, QrCode, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card/70 print:hidden">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          <div className="flex items-center gap-2.5" aria-label="Logo MBG Dapur">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <QrCode className="size-4" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">MBG Dapur</span>
              <span className="block text-xs text-muted-foreground">Distribusi terpadu</span>
            </span>
          </div>

          <span className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />

          <div className="flex items-center gap-2.5" aria-label="Logo Lomba Inovasi 2026">
            <span className="flex size-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700">
              <Award className="size-4" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">Lomba Inovasi</span>
              <span className="block text-xs text-muted-foreground">Karya Digital 2026</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground md:justify-end">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p>Copyright &copy; 2026 MBG Dapur. Dibuat untuk layanan pangan yang lebih tertib.</p>
        </div>
      </div>
    </footer>
  );
}
