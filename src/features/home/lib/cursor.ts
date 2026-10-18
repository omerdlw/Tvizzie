// The canvases draw their own cards, so the house cursor cannot find them in
// the page: each tells it, through the canvas's data, which film the pointer
// is over and where that film's picture is on the screen, and the cursor
// frames that and slates it with the film's name as it does any card.

export interface Pointed {
  // The picture on the page, in CSS pixels: left, top, right, bottom.
  box: readonly [number, number, number, number];
  // The picture's corner, in CSS pixels.
  corner: number;
  title: string;
  year: number | null;
}

export function point(canvas: HTMLElement, at: Pointed | null): void {
  const data = canvas.dataset;
  if (!at) {
    if (data.cursor === undefined) return;
    // The box is left: the cursor lingers a moment on what it framed.
    delete data.cursor;
    delete data.cursorLabel;
    return;
  }
  const label = at.year ? `${at.title} (${at.year})` : at.title;
  const box = at.box.map((value) => value.toFixed(1)).join(",");
  const corner = at.corner.toFixed(1);
  if (data.cursor !== "card") data.cursor = "card";
  if (data.cursorLabel !== label) data.cursorLabel = label;
  if (data.cursorBox !== box) data.cursorBox = box;
  if (data.cursorCorner !== corner) data.cursorCorner = corner;
}

// The box round some points of the page.
export function bounds(
  points: readonly { x: number; y: number }[],
): [number, number, number, number] {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const { x, y } of points) {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return [left, top, right, bottom];
}
