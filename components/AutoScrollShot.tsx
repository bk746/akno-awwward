"use client";

import { useEffect, useRef } from "react";

type AutoScrollShotProps = {
  src: string;
  srcMobile: string;
  alt: string;
  priority?: boolean;
};

const PAUSE = 1500;
const ease = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

function cyclePos(t: number, dist: number, down: number, up: number) {
  const total = PAUSE + down + PAUSE + up;
  let tt = t % total;
  if (tt < PAUSE) return 0;
  tt -= PAUSE;
  if (tt < down) return ease(tt / down) * dist;
  tt -= down;
  if (tt < PAUSE) return dist;
  tt -= PAUSE;
  return (1 - ease(tt / up)) * dist;
}

export default function AutoScrollShot({
  src,
  srcMobile,
  alt,
  priority = false,
}: AutoScrollShotProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const img = imgRef.current;
    if (!box || !img) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      img.style.transform = "translate3d(0,0,0)";
      return;
    }

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let dist = 0;
    let down = 0;
    let up = 0;
    let t = 0;
    let last = 0;
    let raf = 0;
    let vis = false;
    let hover = false;

    const measure = () => {
      dist = Math.max(0, img.offsetHeight - box.clientHeight);
      down = Math.min(25000, Math.max(12000, dist / 0.09));
      up = Math.min(7000, Math.max(3500, down * 0.32));
    };

    const apply = (y: number) => {
      img.style.transform = `translate3d(0,${-y.toFixed(1)}px,0)`;
    };

    const frame = (now: number) => {
      const dt = Math.min(64, now - (last || now));
      last = now;
      if (vis && !hover && dist > 0) {
        t += dt;
        apply(cyclePos(t, dist, down, up));
      }
      raf = vis && !hover ? requestAnimationFrame(frame) : 0;
      if (!raf) last = 0;
    };

    const kick = () => {
      if (!raf && vis && !hover) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const onLoad = () => {
      measure();
      kick();
    };

    const onResize = () => {
      const total = PAUSE + down + PAUSE + up;
      const ratio = dist && total ? cyclePos(t, dist, down, up) / dist : 0;
      measure();
      if (dist) apply(ratio * dist);
    };

    const onEnter = () => {
      hover = true;
    };
    const onLeave = () => {
      hover = false;
      kick();
    };

    if (img.complete && img.naturalHeight) measure();
    else img.addEventListener("load", onLoad);

    window.addEventListener("resize", onResize);

    const io = new IntersectionObserver(
      ([entry]) => {
        vis = entry.isIntersecting && entry.intersectionRatio >= 0.45;
        if (vis) {
          if (!dist) measure();
          kick();
        }
      },
      { threshold: [0, 0.45, 0.6, 1] },
    );
    io.observe(box);

    if (fine) {
      box.addEventListener("pointerenter", onEnter);
      box.addEventListener("pointerleave", onLeave);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      img.removeEventListener("load", onLoad);
      window.removeEventListener("resize", onResize);
      box.removeEventListener("pointerenter", onEnter);
      box.removeEventListener("pointerleave", onLeave);
    };
  }, [src, srcMobile]);

  return (
    <div
      ref={boxRef}
      data-autoscroll=""
      className="case__media"
      style={{
        position: "relative",
        aspectRatio: "16 / 10",
        overflow: "hidden",
        background: "#0d0d14",
      }}
    >
      <img
        ref={imgRef}
        className="case__scroll"
        src={src}
        srcSet={`${srcMobile} 600w, ${src} 1200w`}
        sizes="(max-width:900px) 92vw, 52vw"
        alt={alt}
        width={1200}
        height={7500}
        decoding="async"
        loading={priority ? undefined : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          willChange: "transform",
        }}
      />
    </div>
  );
}
