/**
 * Menunggu `promise` selesai paling lama `ms` milidetik.
 * - Selesai lebih cepat  -> mengembalikan hasilnya.
 * - Gagal                -> melempar kesalahan (mis. ditolak Security Rules).
 * - Belum selesai di `ms` -> kembali tanpa hasil. Dipakai untuk penulisan Firestore saat offline:
 *   penulisan tersimpan di cache lokal dan disinkronkan nanti, jadi layar tidak perlu menunggu.
 */
export function settleWithin(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
