"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";
import { parseMapsLocation } from "@/shared/lib/geo";
import { ROLE_LABEL } from "@/shared/auth/rbac";
import { ROLES, type Role } from "@/shared/types/enums";

const loginSchema = z.object({
  email: z.string().email("Masukkan email yang valid"),
  password: z.string().min(3, "Kata sandi terlalu pendek"),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nama terlalu pendek"),
    email: z.string().email("Masukkan email yang valid"),
    password: z.string().min(6, "Kata sandi minimal 6 karakter"),
    confirmPassword: z.string().min(6, "Konfirmasi kata sandi"),
    role: z.enum(ROLES),
    sppgName: z.string().optional(),
    sppgAddress: z.string().optional(),
    mapsUrl: z.string().optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  })
  .superRefine((values, ctx) => {
    if (values.role !== "SUPERVISOR") return;
    if (!values.sppgName || values.sppgName.trim().length < 2) {
      ctx.addIssue({ code: "custom", message: "Nama SPPG wajib", path: ["sppgName"] });
    }
    if (!values.sppgAddress || values.sppgAddress.trim().length < 4) {
      ctx.addIssue({ code: "custom", message: "Alamat SPPG wajib", path: ["sppgAddress"] });
    }
    if (!values.mapsUrl?.trim()) {
      ctx.addIssue({ code: "custom", message: "Link Google Maps wajib", path: ["mapsUrl"] });
      return;
    }
    if (!parseMapsLocation(values.mapsUrl)) {
      ctx.addIssue({
        code: "custom",
        message: "Link Maps tidak berisi koordinat. Buka lokasi → Bagikan → salin link penuh.",
        path: ["mapsUrl"],
      });
    }
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type AuthMode = "login" | "register";

const FADE_MS = 280;

const demos = [
  { role: "Supervisor", email: "supervisor@sppg.local", password: "supervisor" },
  { role: "Orang Dapur", email: "dapur@sppg.local", password: "dapur" },
  { role: "Distributor", email: "distributor@sppg.local", password: "distributor" },
];

const LANDING_IMAGE =
  "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function LoginContainer() {
  const queryClient = useQueryClient();
  const next = safeNextPath(useSearchParams().get("next"));
  const [mode, setMode] = useState<AuthMode>("login");
  const [opaque, setOpaque] = useState(true);
  const switching = useRef(false);
  const timers = useRef<number[]>([]);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "supervisor@sppg.local", password: "supervisor" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "KITCHEN",
      sppgName: "",
      sppgAddress: "",
      mapsUrl: "",
    },
  });

  const registerRole = registerForm.watch("role");

  async function onLogin(values: LoginValues) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      toast.error(body?.error ?? "Gagal masuk");
      return;
    }
    queryClient.clear();
    window.location.assign(next);
  }

  async function onRegister(values: RegisterValues) {
    const coords = values.role === "SUPERVISOR" ? parseMapsLocation(values.mapsUrl ?? "") : null;
    const response = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        ...(values.role === "SUPERVISOR" && coords
          ? {
              sppgName: values.sppgName,
              sppgAddress: values.sppgAddress,
              sppgLat: coords.lat,
              sppgLng: coords.lng,
            }
          : {}),
      }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      toast.error(body?.error ?? "Gagal mendaftar");
      return;
    }
    toast.success("Akun berhasil dibuat");
    queryClient.clear();
    window.location.assign(next);
  }

  const isRegister = mode === "register";

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  useEffect(() => () => clearTimers(), []);

  function switchMode(nextMode: AuthMode) {
    if (nextMode === mode || switching.current) return;
    switching.current = true;
    clearTimers();
    setOpaque(false);

    const swapId = window.setTimeout(() => {
      setMode(nextMode);
      const showId = window.setTimeout(() => {
        setOpaque(true);
        const unlockId = window.setTimeout(() => {
          switching.current = false;
        }, FADE_MS);
        timers.current.push(unlockId);
      }, 40);
      timers.current.push(showId);
    }, FADE_MS);
    timers.current.push(swapId);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#f4f7fb_0%,#eef3f8_45%,#f8fafc_100%)]">
      <section
        className={cn(
          "auth-fade relative z-10 min-h-[40vh] overflow-hidden sm:absolute sm:inset-y-0 sm:left-0 sm:w-1/2 sm:min-h-screen",
          isRegister ? "sm:translate-x-full" : "sm:translate-x-0",
          opaque ? "opacity-100" : "opacity-0",
        )}
      >
        <img
          src={LANDING_IMAGE}
          alt="Dapur SPPG menyiapkan makanan bergizi"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#0b1f3a]/92 via-[#0b1f3a]/55 to-[#0b1f3a]/25" />
        <div className="relative z-10 flex h-full min-h-[40vh] flex-col justify-between p-6 text-white sm:min-h-screen sm:p-10">
          <p className="text-sm font-semibold tracking-[0.28em] uppercase">MBG SPPG</p>
          <div className="max-w-md space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {isRegister ? "Gabung tim dapur & distribusi" : "Dapur & distribusi yang terpantau"}
            </h1>
            <p className="text-sm leading-relaxed text-white/80">
              {isRegister
                ? "Buat akun operasional untuk mulai mencatat lot, produksi, dan pengiriman sekolah."
                : "Lot bahan, produksi paralel, pengiriman sekolah, dan countdown batas aman dalam satu alur kerja."}
            </p>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "auth-fade relative z-20 flex items-center justify-center px-6 py-10 sm:absolute sm:inset-y-0 sm:left-0 sm:w-1/2 sm:min-h-screen",
          isRegister ? "sm:translate-x-0" : "sm:translate-x-full",
          opaque ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="w-full max-w-md">
          {mode === "login" ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight">Masuk</h2>
                <p className="mt-1 text-sm text-muted-foreground">Gunakan akun operasional SPPG.</p>
              </div>

              <form className="space-y-4" onSubmit={loginForm.handleSubmit(onLogin)}>
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email ? (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Kata sandi</Label>
                  <Input id="login-password" type="password" {...loginForm.register("password")} />
                  {loginForm.formState.errors.password ? (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  ) : null}
                </div>
                <Button className="w-full" type="submit" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting ? "Memeriksa..." : "Masuk"}
                </Button>
              </form>

              <div className="mt-6 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Akun demo</p>
                {demos.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border bg-background/80 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                    onClick={() => loginForm.reset({ email: demo.email, password: demo.password })}
                  >
                    <span>{demo.role}</span>
                    <span className="text-xs text-muted-foreground">{demo.email}</span>
                  </button>
                ))}
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <button
                  type="button"
                  className="font-medium text-primary transition-colors hover:underline"
                  onClick={() => switchMode("register")}
                >
                  Daftar
                </button>
              </p>
            </>
          ) : (
            <>
                <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight">Daftar</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {registerRole === "SUPERVISOR"
                    ? "Supervisor mendaftarkan SPPG sekaligus (nama, alamat, koordinat)."
                    : "Buat akun dapur/distributor untuk SPPG yang sudah ada."}
                </p>
              </div>

              <form className="space-y-4" onSubmit={registerForm.handleSubmit(onRegister)}>
                <div className="space-y-1.5">
                  <Label htmlFor="register-name">Nama</Label>
                  <Input id="register-name" {...registerForm.register("name")} />
                  {registerForm.formState.errors.name ? (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-email">Email</Label>
                  <Input id="register-email" type="email" {...registerForm.register("email")} />
                  {registerForm.formState.errors.email ? (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-role">Peran</Label>
                  <Controller
                    control={registerForm.control}
                    name="role"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="register-role" className="w-full">
                          <SelectValue placeholder="Pilih peran" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABEL[role as Role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {registerRole === "SUPERVISOR" ? (
                  <div className="space-y-3 rounded-lg border border-dashed p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Lokasi SPPG / tempat MBG
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="sppg-name">Nama SPPG</Label>
                      <Input id="sppg-name" placeholder="SPPG Cilandak" {...registerForm.register("sppgName")} />
                      {registerForm.formState.errors.sppgName ? (
                        <p className="text-xs text-destructive">{registerForm.formState.errors.sppgName.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sppg-address">Alamat SPPG</Label>
                      <Input id="sppg-address" {...registerForm.register("sppgAddress")} />
                      {registerForm.formState.errors.sppgAddress ? (
                        <p className="text-xs text-destructive">
                          {registerForm.formState.errors.sppgAddress.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sppg-maps">Link Google Maps</Label>
                      <Input
                        id="sppg-maps"
                        placeholder="https://www.google.com/maps/place/..."
                        {...registerForm.register("mapsUrl")}
                      />
                      {registerForm.formState.errors.mapsUrl ? (
                        <p className="text-xs text-destructive">{registerForm.formState.errors.mapsUrl.message}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Di Maps: pin lokasi → Bagikan → salin link (bukan short link goo.gl).
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="register-password">Kata sandi</Label>
                  <Input id="register-password" type="password" {...registerForm.register("password")} />
                  {registerForm.formState.errors.password ? (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-confirm">Konfirmasi kata sandi</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    {...registerForm.register("confirmPassword")}
                  />
                  {registerForm.formState.errors.confirmPassword ? (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  ) : null}
                </div>
                <Button className="w-full" type="submit" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting ? "Membuat akun..." : "Daftar"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <button
                  type="button"
                  className="font-medium text-primary transition-colors hover:underline"
                  onClick={() => switchMode("login")}
                >
                  Masuk
                </button>
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
