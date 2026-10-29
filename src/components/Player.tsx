import { useEffect, useRef } from "react";
/**
 * cubing.js animated player. Shows the case, then plays the alg to solved.
 * cubing.js holds white on top by default, so the setup ends with z2 to match our yellow-on-top algs.
 * (Its stickering masks assume white on top too, so we show full colours.)
 */
export function Player({ alg, className = "" }: { alg: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: HTMLElement | undefined;
    let cancelled = false;
    import("cubing/twisty").then(({ TwistyPlayer }) => {
      if (cancelled || !host.current) return;
      const p = new TwistyPlayer({
        puzzle: "3x3x3",
        alg,
        experimentalSetupAlg: "z2",
        experimentalSetupAnchor: "end",
        background: "none",
        controlPanel: "bottom-row",
        hintFacelets: "none",
        tempoScale: 1.6,
        cameraDistance: 5.2,
        viewerLink: "none",
      });
      p.style.width = "100%";
      p.style.height = "100%";
      host.current.replaceChildren(p);
      player = p;
    });
    return () => {
      cancelled = true;
      player?.remove();
    };
  }, [alg]);

  return <div ref={host} className={`aspect-[4/3] w-full ${className}`} />;
}
