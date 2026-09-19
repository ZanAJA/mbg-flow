# MBG Flow: Dapur & Distribusi

Sistem operasional SPPG untuk alur **lot bahan baku → rekomendasi menu → production batch paralel → delivery batch per sekolah → QR publik + countdown batas aman konsumsi**.

Aplikasi ini adalah sistem monitoring dan decision support, bukan alat diagnosis keamanan pangan. Angka `safe_until` selalu dihitung dari ruleset tervalidasi di server, bukan dari output AI.

## Stack

| Layer | Rekomendasi |
| --- | --- |
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Lucide |
| Data fetching | TanStack Query |
| Form & validation | React Hook Form + Zod |
| Backend | Next.js Route Handlers + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + HttpOnly Cookie + RBAC di Next.js proxy dan Route Handlers |
| AI | Vercel AI SDK / provider SDK + Zod structured output |
| QR | qrcode |
| Label/PDF | @react-pdf/renderer |
| Maps / ETA | Google Maps Routes API |
| Queue / Alert P1 | Redis + BullMQ |
| Monorepo | pnpm + Turborepo |
| Testing | Vitest + Playwright |
| Deployment | Docker + VPS / managed platform |

## Menjalankan secara lokal

```bash
pnpm install
cp .env.example .env
pnpm db:reset
pnpm dev
```

Aplikasi berjalan di [http://127.0.0.1:43127](http://127.0.0.1:43127).

Pastikan PostgreSQL lokal tersedia dan `DATABASE_URL` di `.env` mengarah ke database yang benar sebelum menjalankan perintah database.

### Akun demo

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Supervisor | supervisor@sppg.local | supervisor |
| Orang Dapur | dapur@sppg.local | dapur |
| Distributor | distributor@sppg.local | distributor |

Halaman `/q/:token` tidak memerlukan login.

## Alur P0 yang bisa dicoba

1. Masuk sebagai Orang Dapur atau Supervisor.
2. Cek lot di **Bahan Baku** (FEFO: expiry terdekat di atas).
3. **Rekomendasi Menu** → pilih menu → buat Production Batch porsi besar/kecil.
4. Di **Produksi**, tekan **Mulai** pada nasi dan lauk tanpa menunggu satu sama lain, lalu **Selesai**.
5. Assign sekolah. Jumlah alokasi tidak boleh melebihi porsi tersedia.
6. **Tandai porsi siap** untuk satu sekolah. Delivery Batch sekolah itu menjadi READY meskipun batch masak belum selesai.
7. Masuk sebagai Distributor, berangkatkan dan tandai diterima. Countdown tetap berjalan.
8. Buka **Label QR**, scan/buka tautan publik. Setelah deadline, halaman tetap bisa dibaca dengan peringatan PAST_LIMIT.

Koreksi timestamp hanya untuk Supervisor dan wajib menyertakan alasan (tercatat di Audit).

## Perintah lain

```bash
pnpm test      # aturan safety + alokasi
pnpm test:e2e  # Playwright
pnpm lint
pnpm build
```

## Catatan data

Skema Prisma menggunakan PostgreSQL. Untuk pengembangan lokal, jalankan PostgreSQL terlebih dahulu lalu isi `DATABASE_URL` berdasarkan `.env.example`.
