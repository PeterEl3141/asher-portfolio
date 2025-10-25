// src/hooks/useInView.js
import { useEffect, useState } from 'react';

export function useInView(ref, { root = null, rootMargin = '0px', threshold = 0.1 } = {}) {
  const [inView, set] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => set(e.isIntersecting), { root, rootMargin, threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, root, rootMargin, threshold]);
  return inView;
}
