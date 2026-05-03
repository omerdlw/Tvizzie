'use client';

import { useEffect, useMemo, useState } from 'react';

import { MovieGridDivider } from '@/features/movie/grid-animation';

const DESKTOP_BREAKPOINT = 1024;

function getDesktopSidebarPrimary() {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.querySelector('[data-movie-sidebar-primary="true"]');
}

export default function MoviePrimaryGridDivider() {
  const [offsetTop, setOffsetTop] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateOffset = () => {
      const sidebarPrimary = getDesktopSidebarPrimary();
      const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;

      if (!isDesktop || !sidebarPrimary) {
        setOffsetTop(0);
        return;
      }

      setOffsetTop(Math.max(0, Math.round(sidebarPrimary.getBoundingClientRect().height)));
    };

    updateOffset();

    const resizeObserver = new ResizeObserver(() => updateOffset());
    const sidebarPrimary = getDesktopSidebarPrimary();

    if (sidebarPrimary) {
      resizeObserver.observe(sidebarPrimary);
    }

    window.addEventListener('resize', updateOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, []);

  const dividerStyle = useMemo(() => (offsetTop > 0 ? { top: `${offsetTop}px` } : undefined), [offsetTop]);

  if (offsetTop <= 0) {
    return null;
  }

  return <MovieGridDivider className="movie-detail-primary-grid-divider" style={dividerStyle} />;
}
