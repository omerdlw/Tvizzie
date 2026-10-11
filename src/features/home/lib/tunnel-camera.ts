// A camera that rides the tunnel's axis and can turn its head a little.
// Matrices are column-major, as WebGL takes them.

export type Vec3 = [number, number, number];

export interface Camera {
  back: Vec3;
  position: Vec3;
  right: Vec3;
  tanHalf: number;
  up: Vec3;
  viewProj: Float32Array;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function camera(
  position: Vec3,
  yaw: number,
  pitch: number,
  fovY: number,
  aspect: number,
): Camera {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const right: Vec3 = [cy, 0, -sy];
  const up: Vec3 = [sy * sp, cp, cy * sp];
  const back: Vec3 = [sy * cp, -sp, cy * cp];

  const view = new Float32Array(16);
  view[0] = right[0];
  view[4] = right[1];
  view[8] = right[2];
  view[12] = -dot(right, position);
  view[1] = up[0];
  view[5] = up[1];
  view[9] = up[2];
  view[13] = -dot(up, position);
  view[2] = back[0];
  view[6] = back[1];
  view[10] = back[2];
  view[14] = -dot(back, position);
  view[15] = 1;

  const tanHalf = Math.tan(fovY / 2);
  const near = 0.05;
  const far = 120;
  const f = 1 / tanHalf;
  const nf = 1 / (near - far);
  const proj = new Float32Array(16);
  proj[0] = f / aspect;
  proj[5] = f;
  proj[10] = (far + near) * nf;
  proj[11] = -1;
  proj[14] = 2 * far * near * nf;

  const viewProj = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += proj[k * 4 + r]! * view[c * 4 + k]!;
      viewProj[c * 4 + r] = sum;
    }
  }

  return { back, position, right, tanHalf, up, viewProj };
}

// A point in the tunnel to CSS pixels, with its distance from the camera;
// null when it is behind the camera.
export function project(
  cam: Camera,
  point: Vec3,
  width: number,
  height: number,
): { depth: number; x: number; y: number } | null {
  const m = cam.viewProj;
  const [x, y, z] = point;
  const cx = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
  const cyy = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  const cw = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!;
  if (cw <= 0.01) return null;
  return {
    depth: cw,
    x: ((cx / cw + 1) / 2) * width,
    y: ((1 - cyy / cw) / 2) * height,
  };
}

// Whether a point lies inside a convex quad given in order around its edge.
export function insideQuad(
  px: number,
  py: number,
  quad: readonly { x: number; y: number }[],
): boolean {
  let sign = 0;
  for (let i = 0; i < quad.length; i += 1) {
    const a = quad[i]!;
    const b = quad[(i + 1) % quad.length]!;
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (cross === 0) continue;
    const side = Math.sign(cross);
    if (sign === 0) sign = side;
    else if (side !== sign) return false;
  }
  return true;
}
