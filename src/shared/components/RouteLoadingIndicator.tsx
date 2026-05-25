"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SHOW_DELAY_MS = 120;
const FALLBACK_HIDE_MS = 12000;

function shouldShowForClick(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  ) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  const destination = new URL(anchor.href, window.location.href);
  const current = new URL(window.location.href);

  if (destination.origin !== current.origin) {
    return false;
  }

  const isSameDocument =
    destination.pathname === current.pathname &&
    destination.search === current.search &&
    destination.hash !== current.hash;

  return !isSameDocument && destination.href !== current.href;
}

export function RouteLoadingIndicator() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (showTimerRef.current) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    clearTimers();
    setIsVisible(false);

    return clearTimers;
  }, [pathname]);

  useEffect(() => {
    const start = () => {
      if (showTimerRef.current) {
        return;
      }

      showTimerRef.current = window.setTimeout(() => {
        setIsVisible(true);
        showTimerRef.current = null;
      }, SHOW_DELAY_MS);

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      hideTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        hideTimerRef.current = null;
      }, FALLBACK_HIDE_MS);
    };

    const handleClick = (event: MouseEvent) => {
      if (shouldShowForClick(event)) {
        start();
      }
    };

    const handlePageShow = () => {
      setIsVisible(false);
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", start);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", start);
      window.removeEventListener("pageshow", handlePageShow);

      if (showTimerRef.current) {
        window.clearTimeout(showTimerRef.current);
      }

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div aria-live="polite" aria-label="ページを読み込み中" role="status">
      <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/10">
        <div className="h-full w-1/3 animate-pulse bg-primary" />
      </div>
      <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg sm:bottom-6 sm:right-6">
        <div className="flex items-center gap-3">
          <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-none">Now Loading...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              画面を準備しています
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
