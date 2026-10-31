"use client";

import { useEffect, type RefObject } from "react";

const NEAR = 520;
const AWAY = "-9999px";
const STIFFNESS = 38;
const DAMPING = 2 * Math.sqrt(STIFFNESS);
const STILL = 0.05;

export function useBeam(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    let last = 0;
    let lit = false;
    let aim: [number, number] | null = null;
    const light = { vx: 0, vy: 0, x: 0, y: 0 };

    const place = () => {
      root.querySelectorAll<HTMLElement>("[data-beam]").forEach((word) => {
        let x = 0;
        let y = 0;
        for (
          let node: HTMLElement | null = word;
          node && node !== root;
          node = node.offsetParent as HTMLElement | null
        ) {
          x += node.offsetLeft;
          y += node.offsetTop;
        }
        word.style.setProperty("--ox", `${x}px`);
        word.style.setProperty("--oy", `${y}px`);
      });
    };
    const darken = () => {
      aim = null;
      if (!lit) return;
      lit = false;
      cancelAnimationFrame(frame);
      frame = 0;
      root.style.setProperty("--bx", AWAY);
      root.style.setProperty("--by", AWAY);
    };
    const paint = (now: number) => {
      frame = 0;
      if (!aim) return;
      const box = root.getBoundingClientRect();
      const [px, py] = aim;
      const far =
        px < box.left - NEAR ||
        px > box.right + NEAR ||
        py < box.top - NEAR ||
        py > box.bottom + NEAR;
      if (far) return darken();
      const tx = px - box.left;
      const ty = py - box.top;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (!lit) {
        lit = true;
        light.x = tx;
        light.y = ty;
        light.vx = 0;
        light.vy = 0;
      } else {
        light.vx += ((tx - light.x) * STIFFNESS - light.vx * DAMPING) * dt;
        light.vy += ((ty - light.y) * STIFFNESS - light.vy * DAMPING) * dt;
        light.x += light.vx * dt;
        light.y += light.vy * dt;
      }
      root.style.setProperty("--bx", `${light.x.toFixed(1)}px`);
      root.style.setProperty("--by", `${light.y.toFixed(1)}px`);
      const moving =
        Math.abs(tx - light.x) + Math.abs(ty - light.y) > STILL ||
        Math.abs(light.vx) + Math.abs(light.vy) > STILL;
      if (moving) frame = requestAnimationFrame(paint);
    };
    const wake = () => {
      if (frame || !aim) return;
      last = performance.now();
      frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      aim = [event.clientX, event.clientY];
      wake();
    };

    place();
    const sizing = new ResizeObserver(place);
    sizing.observe(root);
    void document.fonts.ready.then(place);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", wake, { passive: true });
    document.documentElement.addEventListener("mouseleave", darken);
    return () => {
      cancelAnimationFrame(frame);
      sizing.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", wake);
      document.documentElement.removeEventListener("mouseleave", darken);
    };
  }, [ref]);
}
