import { useEffect, useRef, useState } from "react";

/** IntersectionObserver-based one-shot reveal. Pair with the `.reveal`/`.is-visible` CSS. */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.12) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      // Reveal before the element reaches the viewport. A negative bottom margin made fast
      // mobile scrolling outrun React/IntersectionObserver and briefly show empty sections.
      { threshold: 0.01, rootMargin: "160px 0px 280px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/** Sets document.title for the lifetime of the component, restoring the previous title on unmount. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
