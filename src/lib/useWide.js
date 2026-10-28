import { useEffect, useState } from 'react';

const QUERY = '(min-width: 900px)';

/** true bila layar cukup lebar untuk tata letak dashboard (PC). Mengikuti perubahan ukuran jendela. */
export default function useWide() {
  const [wide, setWide] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setWide(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}