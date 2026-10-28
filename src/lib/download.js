/** Unduh teks sebagai berkas (khusus browser). BOM supaya Excel membaca UTF-8 dengan benar. */
export function downloadText(filename, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob(['﻿', text], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}