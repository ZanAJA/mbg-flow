import { ShieldCheck } from "lucide-react";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card/70 print:hidden">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground md:justify-end">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p>Copyright &copy; 2026 MBG Flow. Dibuat untuk layanan pangan yang lebih tertib.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          <div className="flex items-center gap-2.5" aria-label="Logo MBG Flow">
            <Image src="/logo-mbgflow.png" alt="Logo MBG Flow" width={36} height={36} />
            <span className="leading-tight">
              <span className="block text-sm font-semibold">MBG Flow</span>
              <span className="block text-sm text-muted-foreground">Dapur & Distribusi</span>
            </span>
          </div>

          <span className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />

          <div className="flex items-center gap-2.5" aria-label="Logo Lomba Inovasi 2026">
            <Image src="/logo-tcc.png" alt="Logo Lomba TCC 2026" height={16} width={16} />
            <span className="leading-tight">
              <span className="block text-sm font-semibold">TCC 2026</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
