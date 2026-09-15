"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

const schema = z.object({
  email: z.string().email("Masukkan email yang valid"),
  password: z.string().min(3, "Kata sandi terlalu pendek"),
});

type FormValues = z.infer<typeof schema>;

const demos = [
  { role: "Supervisor", email: "supervisor@sppg.local", password: "supervisor" },
  { role: "Orang Dapur", email: "dapur@sppg.local", password: "dapur" },
  { role: "Distributor", email: "distributor@sppg.local", password: "distributor" },
];

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function LoginContainer() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "supervisor@sppg.local", password: "supervisor" },
  });

  async function onSubmit(values: FormValues) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      toast.error(body?.error ?? "Gagal masuk");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#d7efe0,_#f7f4ea_45%)] px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">MBG SPPG</p>
          <CardTitle>Masuk ke dapur distribusi</CardTitle>
          <CardDescription>
            Sistem monitoring lot, produksi paralel, pengiriman sekolah, dan countdown batas aman konsumsi.
            Bukan alat diagnosis keamanan pangan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Memeriksa..." : "Masuk"}
            </Button>
          </form>
          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Akun demo</p>
            {demos.map((demo) => (
              <button
                key={demo.email}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => form.reset({ email: demo.email, password: demo.password })}
              >
                <span>{demo.role}</span>
                <span className="text-xs text-muted-foreground">{demo.email}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
