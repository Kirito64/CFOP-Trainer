import { useEffect, useState } from "react";
import { localDay } from "./localDay";

/** Refresh at midnight and after a sleeping/background tab becomes active again. */
export function useLocalDay() {
  const [day, setDay] = useState(() => localDay());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const next = localDay();
      setDay((current) => current.start === next.start && current.end === next.end ? current : next);
      timer = setTimeout(refresh, Math.max(1, next.end - Date.now()));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return day;
}
