interface Pointer {
  x: number;
  y: number;
  present: boolean;
}

const pointer: Pointer = { present: false, x: 0, y: 0 };

let users = 0;

const move = (event: PointerEvent) => {
  if (event.pointerType !== "mouse") return;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.present = true;
};
const leave = () => {
  pointer.present = false;
};

export function watchPointer(): () => void {
  if (users++ === 0) {
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
  }
  return () => {
    if (--users > 0) return;
    window.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("mouseleave", leave);
  };
}

export function pointerFromCentre(): [number, number] {
  if (!pointer.present) return [0, 0];
  return [
    (pointer.x / window.innerWidth) * 2 - 1,
    (pointer.y / window.innerHeight) * 2 - 1,
  ];
}
