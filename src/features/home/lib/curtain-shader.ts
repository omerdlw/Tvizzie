// The picture palace, drawn in one pass and in linear light, back to front:
// the dark of the stage with the screen in it, the velvet curtain in front
// of that, the swagged border with its gold fringe across the top, the gilt
// frame and the walls either side, the polished boards of the apron with the
// footlights along its edge, the projector's beam through the haze, and the
// backs of the seats nearest the camera. The frame is developed afterwards
// by the tunnel's bloom and composite passes.
//
// Every surface is lit by the same few lamps: the footlights, low and warm,
// throwing scallops of light up the curtain; a faint fill from the house;
// and the projector, which throws the year on the curtain while it is
// closed and the film on the screen once it is open.

export const CURTAIN_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLook;
// Half the opening's width, its top, the stage line and the apron's front.
uniform vec4 uStage;
uniform float uSeats;
// The screen: its middle and half its size.
uniform vec4 uScreen;
// How far the curtain is drawn, and how fast it is moving.
uniform float uOpen;
uniform float uSwing;
// The footlights and the house lights coming up, 0..1.
uniform float uLit;
// The projector on the screen, and the colour the film throws.
uniform float uProject;
uniform vec3 uFilmLight;
uniform sampler2D uFilm;
// How the film's picture is fitted to the screen: a scale about its middle.
uniform vec2 uFilmFit;
uniform float uHover;
// The year thrown on the closed curtain: four rolling digits, where it is,
// and how strongly it is thrown.
uniform sampler2D uDigits;
uniform vec4 uYear;
uniform vec3 uYearAt;
uniform float uYearOn;

const vec3 VELVET = vec3(0.30, 0.009, 0.018);
const vec3 SHEEN = vec3(1.0, 0.26, 0.22);
const vec3 GOLD = vec3(1.0, 0.68, 0.28);
const vec3 WARM = vec3(1.0, 0.66, 0.36);
const vec3 LAMP = vec3(1.0, 0.93, 0.82);
const float FOOT_GAP = 0.13;
const float TAU = 6.2831853;
// The width of one digit of the year, in its own heights.
const float DIGIT = 0.4375;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += noise(p) * amp;
    p = p * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}

// The lamps that light every surface: the footlights below the front of
// the stage, in pools, and a faint fill from the house behind the camera.
vec3 lamps(vec2 p, vec3 n) {
  float above = max(p.y - uStage.w, 0.0);
  float pools = 0.45 + 0.55 * pow(0.5 + 0.5 * cos(p.x * TAU / FOOT_GAP), 3.0);
  float foot = exp(-above * 3.4) * mix(1.0, pools, exp(-above * 2.0));
  vec3 lf = normalize(vec3(0.0, -0.6, 1.0));
  vec3 lh = normalize(vec3(-0.3, 0.45, 1.0));
  return (WARM * foot * 1.25 * max(dot(n, lf), 0.0) +
    vec3(0.55, 0.45, 0.42) * 0.045 * max(dot(n, lh), 0.0)) * uLit;
}

// Polished gold under the same lamps, with the highlight the footlights
// put in it.
vec3 gilt(vec2 p, vec3 n) {
  vec3 lit = lamps(p, n);
  vec3 h = normalize(normalize(vec3(0.0, -0.6, 1.0)) + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, h), 0.0), 28.0);
  float level = dot(lit, vec3(0.333));
  return GOLD * (0.025 * uLit + lit * 0.55) + GOLD * spec * level * 2.4;
}

// How much of the year's lettering a point of the closed curtain catches.
float yearAt(vec2 p) {
  vec2 u = (p - uYearAt.xy) / uYearAt.z;
  float across = DIGIT * 4.0;
  float gx = u.x + across * 0.5;
  if (gx < 0.0 || gx >= across || abs(u.y) > 0.5) return 0.0;
  float slot = floor(gx / DIGIT);
  float lx = fract(gx / DIGIT);
  float d = slot < 0.5 ? uYear.x : slot < 1.5 ? uYear.y : slot < 2.5 ? uYear.z : uYear.w;
  // The strip holds 0 to 9 and 0 again, top to bottom, one to a cell.
  float v = (d + 0.5 - u.y) / 11.0;
  return textureLod(uDigits, vec2(lx, v), 0.6).r;
}

// The dark of the stage behind the curtain, and the screen in it.
vec3 backstage(vec2 p) {
  vec3 col = vec3(0.0035, 0.0028, 0.0026) * uLit;
  vec2 q = (p - uScreen.xy) / uScreen.zw;
  float edge = max(abs(q.x), abs(q.y));
  // The screen's light falls on the stage around it.
  col += uFilmLight * uProject * 0.05 * exp(-max(edge - 1.0, 0.0) * 14.0);
  if (edge < 1.0) {
    vec2 uv = 0.5 + vec2(q.x, -q.y) * 0.5 * uFilmFit;
    vec3 picture = vec3(0.0);
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
      picture = pow(texture(uFilm, uv).rgb, vec3(2.2));
    }
    // A screen is not quite even: brighter in the middle, and finely
    // perforated.
    float hot = 1.0 - 0.28 * dot(q, q) * 0.5;
    float holes = 0.94 + 0.06 * step(0.35, fract(p.x * uRes.y * 0.5) * fract(p.y * uRes.y * 0.5));
    vec3 lit = picture * uProject * hot * holes * (1.25 + 0.15 * uHover);
    // A thin black mask around the picture.
    float mask = smoothstep(1.0, 0.985, edge);
    col = mix(col, vec3(0.012) * uLit + lit, mask);
  }
  return col;
}

// One half of the curtain: its colour, and in alpha how much of the pixel
// it covers. Each half is a length of cloth hung in pleats from a track,
// drawn back toward its side; the more it is drawn, the tighter and deeper
// its pleats. The hem trails the track while it moves.
vec4 curtain(vec2 p, float aa) {
  float half_ = uStage.x;
  float top = uStage.y;
  float stage = uStage.z;
  float side = p.x < 0.0 ? -1.0 : 1.0;
  float ax = abs(p.x);
  float down = clamp((top - p.y) / (top - stage), 0.0, 1.0);

  float drawn = uOpen * half_ * 0.84;
  float lead = drawn - uSwing * 0.045 * down * down;
  lead += sin(p.y * 23.0 + uTime * 0.8 + side) * 0.0018;
  lead = max(lead, -0.006);
  float outer = half_ + 0.2;
  float gather = outer / max(outer - lead, 0.035);
  float s = max(ax - lead, 0.0) * gather;

  // Pleats close together at the track, opening out toward the floor.
  float period = 0.064 * mix(0.82, 1.3, down);
  float ph = s / period * TAU + (noise(vec2(s * 6.0, side * 4.0)) - 0.5) * 2.6;
  // A slow wave runs down the cloth, more so just after it has moved.
  ph += sin(p.y * 6.0 - uTime * 1.1 + s * 2.5) * (0.12 + min(abs(uSwing), 2.0) * 0.9);
  float pleat = floor(ph / TAU);
  float depth = 0.65 + 0.7 * hash(vec2(pleat, side * 3.0));
  float wave = sin(ph);
  float tight = clamp((gather - 1.0) / 3.0, 0.0, 1.0);
  float slope = cos(ph) * depth * mix(0.9, 2.4, tight) * side;
  vec3 n = normalize(vec3(-slope, -0.1 * down, 1.0));

  // The hem rides the pleats, a little above the boards.
  float hem = stage + 0.004 + (1.0 - (0.5 + 0.5 * wave)) * 0.008;
  float cover = smoothstep(lead - aa, lead + aa, ax) *
    smoothstep(hem - aa, hem + aa, p.y);
  if (cover <= 0.0) return vec4(0.0);

  vec3 albedo = VELVET * (0.78 + 0.44 * noise(vec2(s * 2.5, p.y * 1.3)));
  albedo *= 0.86 + 0.28 * noise(vec2(p.x * 850.0, p.y * 7.0));
  float valley = mix(0.18, 1.0, smoothstep(-1.0, 0.75, wave));

  vec3 light = lamps(p, n);
  // The projector, from the back of the house: the year, in a soft pool.
  vec3 lp = normalize(vec3(0.0, 0.22, 1.0));
  float facing = max(dot(n, lp), 0.0);
  vec2 off = (p - uYearAt.xy) / uYearAt.z;
  float pool = exp(-dot(off * vec2(0.55, 1.0), off * vec2(0.55, 1.0)) * 1.6);
  float glyph = yearAt(p + vec2(n.x * 0.005, 0.0));
  light += LAMP * (pool * 0.5 + glyph * 6.5) * facing * uYearOn;
  // The screen lights the edges of the drawn curtain.
  float gap = max(ax - lead, 0.0);
  light += uFilmLight * uProject * 0.9 * exp(-gap / 0.045) *
    max(0.35 - n.x * side, 0.0);

  float level = dot(light, vec3(0.3333));
  vec3 sheen = SHEEN * pow(1.0 - max(n.z, 0.0), 2.2) * level * 0.5;
  // The leading edge is a heavy hem, turned and lit along its fold.
  float edge = smoothstep(0.012, 0.0, ax - lead);
  vec3 col = (albedo * light + sheen) * valley;
  // The pile throws back a little of the lamp's own colour where the year
  // is brightest.
  col += LAMP * glyph * facing * uYearOn * 0.05 * mix(0.6, 1.0, valley);
  col += albedo * level * edge * 0.6;
  return vec4(col, cover);
}

// The border across the top of the opening: velvet hung in swags, with a
// gold fringe along its edge and a tassel where two swags meet.
vec4 valance(vec2 p, float aa) {
  float half_ = uStage.x;
  float top = uStage.y;
  if (abs(p.x) > half_ + 0.02 || p.y > top + 0.01) return vec4(0.0);
  float swags = max(3.0, floor(half_ * 2.0 / 0.22 + 0.5));
  float span = (half_ * 2.0 + 0.04) / swags;
  float u = (p.x + half_ + 0.02) / span;
  float f = fract(u);
  float sag = 4.0 * f * (1.0 - f);
  float bottom = top - 0.1 * 0.62 - 0.1 * 0.38 * sag;

  vec4 out_ = vec4(0.0);
  if (p.y > bottom - aa) {
    // Pleats run along each swag, bowing with it.
    float into = (top - p.y) / max(top - bottom, 1e-3);
    float ph = (into * 5.0 + sag * 0.6 * into) * TAU;
    vec3 n = normalize(vec3((f - 0.5) * 0.9 * into, -cos(ph) * 0.9, 1.0));
    vec3 albedo = VELVET * (0.85 + 0.3 * noise(vec2(p.x * 700.0, p.y * 9.0)));
    vec3 light = lamps(p, n) + LAMP * 0.05 * uYearOn;
    float valley = mix(0.3, 1.0, 0.5 + 0.5 * sin(ph));
    vec3 col = albedo * light * valley + SHEEN * pow(1.0 - n.z, 2.0) * dot(light, vec3(0.3)) * 0.4;
    // A shadow it casts on what hangs behind it.
    out_ = vec4(col, smoothstep(bottom - aa, bottom + aa, p.y));
  }

  // The fringe: fine threads of gold, of uneven length, stirring.
  float below = bottom - p.y;
  float threads = 640.0;
  float sway = sin(uTime * 1.2 + p.x * 9.0) * 0.0015 * clamp(below / 0.024, 0.0, 1.0);
  float tx = (p.x + sway) * threads;
  float id = floor(tx);
  float length_ = 0.019 + 0.007 * hash(vec2(id, 2.0));
  if (below > -aa && below < length_) {
    float thread = smoothstep(0.5, 0.15, abs(fract(tx) - 0.5));
    float tip = smoothstep(length_, length_ - 0.004, below);
    vec3 n = normalize(vec3(sin(id * 1.7) * 0.5, -0.3, 1.0));
    vec3 col = gilt(p, n) * (0.7 + 0.6 * hash(vec2(id, 7.0)));
    float a = thread * tip * 0.85;
    out_.rgb = out_.a > 0.001 ? mix(out_.rgb, col, a) : col;
    out_.a = max(out_.a, a);
  }

  // A tassel where two swags meet.
  float joint = floor(u + 0.5) * span - half_ - 0.02;
  vec2 t = vec2(p.x - joint, p.y - (top - 0.1 * 0.62 - 0.03));
  float drop = length(t * vec2(1.0, 0.42)) - 0.0105;
  float cord = max(abs(t.x) - 0.0015, abs(t.y - 0.02) - 0.02);
  float tassel = min(drop, cord);
  if (tassel < aa && abs(joint) <= half_ + 0.021) {
    vec3 n = normalize(vec3(t.x * 60.0, t.y * 25.0, 1.0));
    float lines = 0.75 + 0.25 * sin(t.x * 2600.0);
    vec3 col = gilt(p, n) * lines * 1.2;
    float a = smoothstep(aa, -aa, tassel);
    out_.rgb = out_.a > 0.001 ? mix(out_.rgb, col, a) : col;
    out_.a = max(out_.a, a);
  }
  return out_;
}

// The frame round the opening, a stepped band of gilt, and the walls of
// the house beyond it, fluted, lit from below and from the stage.
vec3 frame(vec2 p) {
  float half_ = uStage.x;
  float top = uStage.y;
  float dx = abs(p.x) - half_;
  float dy = p.y - top;
  float out_ = max(dx, dy);
  float band = 0.03;
  if (out_ < band && p.y > uStage.z - 0.005) {
    float t = out_ / band;
    float ridge = cos(t * 3.0 * 3.14159) * (1.0 - t * 0.4);
    vec3 n = dx > dy
      ? normalize(vec3(sign(p.x) * ridge * 0.9, 0.0, 1.0))
      : normalize(vec3(0.0, ridge * 0.9, 1.0));
    float bead = smoothstep(0.08, 0.0, abs(t - 0.52)) * (0.6 + 0.4 * sin((dx > dy ? p.y : p.x) * 700.0));
    return gilt(p, n) * (0.85 + 0.5 * bead);
  }
  // The wall: fluted panels in dark lacquer.
  float flute = sin(p.x * TAU / 0.04);
  vec3 n = normalize(vec3(cos(p.x * TAU / 0.04) * 0.5, 0.0, 1.0));
  vec3 lacquer = vec3(0.032, 0.011, 0.008) * (0.85 + 0.3 * noise(vec2(p.x * 40.0, p.y * 3.0)));
  vec3 col = lacquer * lamps(p, n) * (0.75 + 0.25 * flute);
  // The light of the screen and of the thrown year spills out of the
  // opening onto the walls.
  float near = exp(-max(out_, 0.0) * 9.0);
  col += lacquer * (uFilmLight * uProject * 3.0 + LAMP * uYearOn * 0.25) * near;
  col += vec3(0.002, 0.0012, 0.001) * uLit;
  return col;
}

// The apron: polished boards running toward the house, holding the curtain
// and the screen in their shine, with the footlights at the front edge.
vec3 apron(vec2 p, float aa) {
  float stage = uStage.z;
  float front = uStage.w;
  float v = clamp((stage - p.y) / (stage - front), 0.0, 1.0);
  float z = 1.0 / mix(0.3, 1.0, v);
  float x = p.x / z;
  float seam = smoothstep(0.012 * z, 0.0, abs(fract(x * 11.0) - 0.5) - 0.48);
  vec3 wood = vec3(0.07, 0.03, 0.013) * (0.7 + 0.5 * noise(vec2(x * 11.0, v * 3.0 + floor(x * 11.0) * 7.0)));
  wood *= 1.0 - seam * 0.5;
  vec3 col = wood * lamps(vec2(p.x, stage), normalize(vec3(0.0, 0.6, 0.8))) * 0.9;

  // What stands on the stage, in the polish, smeared as it falls away.
  vec2 m = vec2(p.x, 2.0 * stage - p.y + 0.002);
  m.x += (noise(vec2(p.x * 30.0, p.y * 80.0)) - 0.5) * 0.004 * (1.0 + v * 4.0);
  vec3 behind = backstage(m);
  vec4 cloth = curtain(m, aa * 4.0);
  behind = mix(behind, cloth.rgb, cloth.a);
  col += behind * mix(0.4, 0.12, v);

  // The front edge, and the lamps along it.
  float lip = smoothstep(front + 0.012, front + 0.011, p.y);
  vec3 brass = gilt(p, normalize(vec3(0.0, 0.5, 1.0)));
  col = mix(col, brass * 0.9, lip);
  return col;
}

vec3 footlights(vec2 p) {
  float front = uStage.w;
  float cell = p.x / FOOT_GAP + 0.5;
  vec2 q = vec2((fract(cell) - 0.5) * FOOT_GAP, p.y - (front + 0.013));
  float bulb = exp(-dot(q * vec2(1.0, 1.7), q * vec2(1.0, 1.7)) / 0.000035);
  float halo = exp(-dot(q, q) / 0.0012);
  float flicker = 0.94 + 0.06 * noise(vec2(floor(cell) * 3.1, uTime * 7.0));
  return WARM * (bulb * 7.0 + halo * 0.18) * flicker * uLit * step(abs(p.x), uStage.x + 0.12);
}

// The projector's beam, from the booth behind and above the camera to
// whatever it is throwing on: haze, and dust turning in it.
vec3 beam(vec2 p) {
  vec4 target = mix(
    vec4(uYearAt.xy, uYearAt.z * 1.2, uYearAt.z * 0.6),
    uScreen,
    smoothstep(0.1, 0.9, uOpen)
  );
  float strength = max(uYearOn * 0.7, uProject);
  if (strength <= 0.0) return vec3(0.0);
  float apex = 0.95;
  float t = (apex - p.y) / (apex - target.y);
  if (t <= 0.02) return vec3(0.0);
  float spread = mix(2.2, 1.0, clamp(t, 0.0, 1.0));
  vec2 half_ = target.zw * spread;
  vec2 mid = mix(vec2(target.x, apex), target.xy, clamp(t, 0.0, 1.0));
  float inside = smoothstep(half_.x, half_.x * 0.55, abs(p.x - mid.x));
  inside *= smoothstep(1.15, 0.85, t) * smoothstep(0.02, 0.4, t);
  float smoke = fbm(vec2(p.x * 3.0 + uTime * 0.02, p.y * 2.0 - uTime * 0.035));
  float rays = 0.6 + 0.8 * noise(vec2(atan(p.x - target.x, apex - p.y) * 40.0, uTime * 0.05));
  float motes = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 g = p * (60.0 + fi * 45.0) + vec2(fi * 13.0, uTime * (0.4 + fi * 0.3));
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id + fi * 5.0);
    vec2 o = (vec2(hash(id + 2.3), hash(id + 7.7)) - 0.5) * 0.6;
    motes += smoothstep(0.06, 0.0, length(f - o)) * step(0.82, h) *
      (0.5 + 0.5 * sin(uTime * (1.0 + h * 3.0) + h * 30.0));
  }
  vec3 tint = mix(LAMP, uFilmLight * 2.2 + LAMP * 0.2, uProject);
  return tint * inside * strength * (smoke * rays * 0.03 + motes * 0.12);
}

// The backs of the two nearest rows of seats, out of focus, some with a
// head above them, picked out along their tops by the light of the stage.
vec4 seats(vec2 p, float aa) {
  vec4 out_ = vec4(0.0);
  for (int row = 1; row >= 0; row--) {
    float r = float(row);
    float width = mix(0.085, 0.12, r);
    float x = p.x + uLook.x * mix(0.03, 0.07, r) + r * 0.043;
    float id = floor(x / width);
    float f = fract(x / width) - 0.5;
    float top = uSeats - r * 0.045 + uLook.y * mix(0.02, 0.05, r);
    float back = top + 0.022 * sqrt(max(0.0, 1.0 - pow(abs(f) * 2.15, 4.0))) - 0.03 * step(0.45, abs(f));
    float occupied = step(0.5, hash(vec2(id, r + 3.0)));
    float hx = (hash(vec2(id, r + 9.0)) - 0.5) * 0.25 * width;
    vec2 head = vec2((f * width - hx) / (width * 0.27), (p.y - top - width * 0.42) / (width * 0.36));
    float headD = (length(head) - 1.0) * width * 0.3;
    float neck = max(abs(f * width - hx) - width * 0.12, p.y - top - width * 0.3);
    float body = p.y - back;
    float shape = min(body, occupied > 0.5 ? min(headD, neck) : 1.0);
    float soft = aa * mix(3.0, 7.0, r) + 0.002 * r;
    float a = smoothstep(soft, -soft, shape);
    // The stage lights their edges.
    float rim = smoothstep(-0.012, 0.0, shape) * a;
    vec3 col = vec3(0.004, 0.0028, 0.0024) +
      (WARM * 0.05 * uLit + uFilmLight * uProject * 0.22 + LAMP * uYearOn * 0.02) * rim;
    out_.rgb = mix(out_.rgb, col, a);
    out_.a = max(out_.a, a);
  }
  return out_;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 c = (vUv - 0.5) * vec2(aspect, 1.0);
  float aa = 1.2 / uRes.y;
  vec2 pb = c + uLook * 0.008;
  vec2 pc = c + uLook * 0.014;
  vec2 pf = c + uLook * 0.02;

  float half_ = uStage.x;
  vec3 col;
  if (pc.y > uStage.z) {
    col = backstage(pb);
    vec4 cloth = curtain(pc, aa);
    col = mix(col, cloth.rgb, cloth.a);
    vec3 walls = frame(pf);
    float shut = smoothstep(-aa, aa, max(abs(pf.x) - half_, pf.y - uStage.y));
    col = mix(col, walls, shut);
    vec4 border = valance(pf, aa);
    col = mix(col, border.rgb, border.a);
  } else if (pc.y > uStage.w) {
    col = apron(pc, aa);
  } else {
    // The pit, and the face of the stage above it.
    float face = smoothstep(uStage.w - 0.05, uStage.w, pc.y);
    col = vec3(0.012, 0.006, 0.004) * uLit * face * face;
  }
  col += footlights(pc);
  col += beam(c);
  vec4 stalls = seats(c, aa);
  col = mix(col, stalls.rgb, stalls.a);
  outColor = vec4(max(col, 0.0), 1.0);
}`;
