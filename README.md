# Habit & Workout Tracker (PWA)

Habit tracker + catatan workout + ukuran tubuh. React + Vite + Firebase (Spark/gratis). Login hanya Google. Data tiap pengguna terpisah.
Spesifikasi lengkap ada di PRD (dokumen terpisah). Status kode: **M1 (fondasi) + M2 (Habit) selesai; M3 (Workout & Tubuh) belum.**

## Setup (once, Windows)
1. Pasang **Node.js LTS** (nodejs.org) dan **VS Code**.
2. Pasang Firebase CLI: `npm i -g firebase-tools`, lalu `firebase login`.
3. Di console.firebase.google.com: **Add project** (matikan Google Analytics, tidak perlu).
4. **Build > Authentication > Get started > Sign-in method > Google > Enable.**
5. **Build > Firestore Database > Create database**, mode *production*, lokasi `asia-southeast2` (Jakarta).
6. **Project settings > Your apps > Web (`</>`)**, daftarkan app, salin nilai config.
7. Di folder proyek: salin `.env.example` menjadi `.env.local`, isi semua nilai `VITE_FIREBASE_*`.
8. Edit `.firebaserc`, ganti `GANTI-DENGAN-ID-PROJECT` dengan Project ID kamu.

## Menjalankan
```
npm install
npm run dev      # buka http://localhost:5173
npm test         # tes logika (tanggal, streak, form)
```

## Rilis
```
firebase deploy --only firestore:rules   # WAJIB sebelum dibagikan ke orang lain
npm run deploy                            # build + hosting
```
Setelah deploy, di Authentication > Settings > Authorized domains pastikan domain `*.web.app` sudah ada.

## Uji sebelum dibagikan
- Login dengan **dua akun Google berbeda**; pastikan data tidak saling terlihat.
- Matikan internet, centang kebiasaan, nyalakan lagi: data harus tersinkron.
- Aturan Firestore **belum diuji di emulator** (`firebase emulators:start`); lakukan sebelum rilis.

## iPhone
Buka lewat Safari > Bagikan > **Tambah ke Layar Utama**. Agar login Google stabil di iOS, isi `VITE_FIREBASE_AUTH_DOMAIN` dengan domain Hosting (`project-id.web.app`), bukan `firebaseapp.com`.

## Struktur
- `src/lib` logika murni + tes (tanggal, streak, statistik, form)
- `src/services` akses Firestore; `schema.js` = sumber kebenaran bentuk data
- `src/pages` layar; `src/components` komponen bersama
- `firestore.rules` aturan keamanan (hanya pemilik data)
