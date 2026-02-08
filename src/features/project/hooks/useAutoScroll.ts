import { useRef, useCallback, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseAutoScrollReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  sentinelRef: (node?: Element | null) => void;
  isAtBottom: boolean;
  scrollToBottom: () => void;
}

export function useAutoScroll(deps: unknown[] = []): UseAutoScrollReturn {
  const scrollContainerRef = useRef<HTMLDivElement>(null!);

  // IntersectionObserver on sentinel div at bottom of scroll content
  const { ref: sentinelRef, inView: isAtBottom } = useInView({
    threshold: 0,
  });

  // Scroll to bottom of the container
  const scrollToBottom = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'instant', // Use 'instant' for jump-to-latest (per research: avoids chasing during rapid arrivals)
    });
  }, []);

  // Auto-scroll when new content arrives AND user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    scrollContainerRef,
    sentinelRef,
    isAtBottom,
    scrollToBottom,
  };
}
