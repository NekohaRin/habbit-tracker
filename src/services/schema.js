// SUMBER KEBENARAN bentuk data Firestore (diringkas di bagian "Model data" pada PRD).
// File ini hanya dokumentasi (JSDoc); tidak ada kode yang dijalankan. Jika bentuk data berubah,
// ubah file ini, firestore.rules, dan PRD bersamaan.
//
// Semua data pengguna ada di bawah  users/{uid}/...  dan hanya bisa diakses pemiliknya.
// Tanggal = teks 'YYYY-MM-DD' menurut zona waktu pengguna (lihat src/lib/dates.js).
// Satuan disimpan metrik (kg, cm); konversi ke lb/inci hanya saat ditampilkan.

/**
 * users/{uid}
 * @typedef {Object} UserProfile
 * @property {string} displayName
 * @property {{unit: 'metric'|'imperial', timezone: string}} settings   bawaan: metric, Asia/Jakarta
 * @property {import('firebase/firestore').Timestamp} createdAt
 */

/**
 * users/{uid}/habits/{habitId}
 * @typedef {Object} Habit
 * @property {string} name                 1..40 karakter
 * @property {'drop'|'book'|'bolt'|'moon'|'pen'|'dots'} icon
 * @property {'kesehatan'|'belajar'|'olahraga'|'kerja'|'lainnya'} category
 * @property {{type:'daily'}|{type:'days', days:number[]}|{type:'weekly', timesPerWeek:number}} frequency
 *           days: 1=Senin..7=Minggu; timesPerWeek: 1..7
 * @property {{amount:number, unit:string}|null} target   angka target opsional (mis. 8 gelas)
 * @property {boolean} linkedWorkout       true = dihitung dari sesi workout; frequency wajib 'weekly'
 * @property {string} startDate            'YYYY-MM-DD'
 * @property {string} note                 0..200 karakter
 * @property {boolean} archived            true = disembunyikan, riwayat tetap ada
 * @property {number} order                urutan tampil
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * users/{uid}/habitLogs/{habitId}_{YYYY-MM-DD}   (id tetap, sehingga satu centang = satu dokumen)
 * @typedef {Object} HabitLog
 * @property {string} habitId
 * @property {string} date
 * @property {boolean} done
 * @property {number|null} value           nilai angka (modul angka target, tahap M2)
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * users/{uid}/exercises/{exerciseId}      (modul Workout, tahap M3)
 * @typedef {Object} Exercise
 * @property {string} name
 * @property {string} muscleGroup
 * @property {boolean} archived
 */

/**
 * users/{uid}/workoutSessions/{sessionId}  (modul Workout, tahap M3)
 * Satu sesi = satu dokumen berisi seluruh latihannya (hemat operasi tulis).
 * @typedef {Object} WorkoutSession
 * @property {string} date
 * @property {number|null} durationMin     opsional
 * @property {string} note
 * @property {{exerciseId:string, exerciseName:string, sets:number, reps:number, weightKg:number|null}[]} entries
 */

/**
 * users/{uid}/bodyParts/{partId}           (modul Tubuh, tahap M4)
 * @typedef {Object} BodyPart
 * @property {string} name
 * @property {number} order
 * @property {boolean} active
 */

/**
 * users/{uid}/measurements/{id}            (modul Tubuh, tahap M4)
 * @typedef {Object} Measurement
 * @property {string} bodyPartId
 * @property {string} date
 * @property {number} valueCm
 */

/**
 * users/{uid}/bodyWeights/{YYYY-MM-DD}     (modul Tubuh, tahap M4; id = tanggal, satu per hari)
 * @typedef {Object} BodyWeight
 * @property {string} date
 * @property {number} valueKg
 */

export {};
