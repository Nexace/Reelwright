// src/gsapConstants.ts
var GSAP_DEFAULT_DURATION = 0.5;
var SUPPORTED_PROPS = [
  // 2D Transforms
  "x",
  "y",
  "scale",
  "scaleX",
  "scaleY",
  "rotation",
  "skewX",
  "skewY",
  // 3D Transforms
  "z",
  "rotationX",
  "rotationY",
  "rotationZ",
  "perspective",
  "transformPerspective",
  "transformOrigin",
  // Visibility
  "opacity",
  "visibility",
  "autoAlpha",
  // Dimensions
  "width",
  "height",
  // Colors
  "color",
  "backgroundColor",
  "borderColor",
  // Box model
  "borderRadius",
  // Typography
  "fontSize",
  "letterSpacing",
  // Filter & Clipping
  "filter",
  "clipPath",
  // DOM content (number counters, text roll-ups)
  "innerText"
];
var BUILTIN_VAR_KEYS = /* @__PURE__ */ new Set(["duration", "ease", "delay"]);
var DROPPED_VAR_KEYS = /* @__PURE__ */ new Set([
  "onComplete",
  "onStart",
  "onUpdate",
  "onRepeat"
]);
var EXTRAS_KEYS = /* @__PURE__ */ new Set([
  "stagger",
  "yoyo",
  "repeat",
  "repeatDelay",
  "snap",
  "overwrite",
  "immediateRender"
]);
function isTweenConfigKey(key) {
  return BUILTIN_VAR_KEYS.has(key) || DROPPED_VAR_KEYS.has(key) || EXTRAS_KEYS.has(key);
}
var PROPERTY_GROUPS = {
  position: /* @__PURE__ */ new Set(["x", "y", "xPercent", "yPercent"]),
  scale: /* @__PURE__ */ new Set(["scale", "scaleX", "scaleY"]),
  size: /* @__PURE__ */ new Set(["width", "height"]),
  rotation: /* @__PURE__ */ new Set(["rotation", "skewX", "skewY"]),
  visual: /* @__PURE__ */ new Set(["opacity", "autoAlpha"]),
  other: /* @__PURE__ */ new Set()
};
var PROP_TO_GROUP = /* @__PURE__ */ new Map();
for (const [group, props] of Object.entries(PROPERTY_GROUPS)) {
  for (const p of props) PROP_TO_GROUP.set(p, group);
}
function writesProperty(animation, property) {
  return property in animation.properties || !!animation.fromProperties && property in animation.fromProperties || !!animation.keyframes?.keyframes.some((k) => property in k.properties);
}
function isXYPositionWrite(a) {
  return a.propertyGroup === "position" && (writesProperty(a, "x") || writesProperty(a, "y"));
}
function classifyPropertyGroup(prop) {
  return PROP_TO_GROUP.get(prop) ?? "other";
}
function classifyTweenPropertyGroup(properties) {
  const groups = /* @__PURE__ */ new Set();
  for (const key of Object.keys(properties)) {
    if (key === "transformOrigin" || key === "_auto" || key === "data") continue;
    const g = classifyPropertyGroup(key);
    groups.add(g);
  }
  if (groups.size === 1) return groups.values().next().value;
  return void 0;
}
function knownStart(animation) {
  if (animation.resolvedStart !== void 0) return animation.resolvedStart;
  return typeof animation.position === "number" ? animation.position : void 0;
}
var tweenSignature = (a) => JSON.stringify([a.targetSelector, a.method, a.position, a.duration, a.properties, a.keyframes]);
function holdScope(before, previous) {
  const kept = new Set(previous?.map(tweenSignature));
  const held = /* @__PURE__ */ new Map();
  for (const a of before.filter((b) => b.method === "set" && b.properties?.data === "hf-hold")) {
    const props = held.get(a.targetSelector) ?? /* @__PURE__ */ new Map();
    for (const [property, value] of Object.entries(a.properties)) props.set(property, value);
    held.set(a.targetSelector, props);
  }
  return {
    touched: (a) => previous === null || !kept.has(tweenSignature(a)),
    held: (selector) => held.get(selector) ?? /* @__PURE__ */ new Map()
  };
}
function keyframeHoldForAnimation(animation, animations, scope) {
  if (!animation.keyframes) return null;
  const start = knownStart(animation);
  const lone = animation.keyframes.keyframes.length === 1;
  if (start === void 0 || !(start > 1e-3) && !lone) return null;
  const atStart = animation.keyframes.keyframes.find((keyframe) => keyframe.percentage === 0);
  if (!atStart) return null;
  const earlier = animations.filter((other) => {
    const otherStart = knownStart(other);
    return other !== animation && !other.global && other.targetSelector === animation.targetSelector && otherStart !== void 0 && otherStart < start - 1e-3;
  });
  const touched = scope.touched(animation);
  const pinned = scope.held(animation.targetSelector);
  const kept = (property, value) => touched ? pinned.has(property) : pinned.get(property) === value;
  const startsLate = start > 1e-3;
  const pins = (group, property, value) => (group === "position" || group === "size") && ((lone || group === "position" && startsLate) && touched || kept(property, value));
  const hold = {};
  for (const [property, value] of Object.entries(atStart.properties)) {
    if (!pins(classifyPropertyGroup(property), property, value) || typeof value !== "number")
      continue;
    if (earlier.some((other) => writesProperty(other, property))) continue;
    hold[property] = value;
  }
  return Object.keys(hold).length > 0 ? hold : null;
}
var SUPPORTED_EASES = [
  "none",
  "power1.in",
  "power1.out",
  "power1.inOut",
  "power2.in",
  "power2.out",
  "power2.inOut",
  "power3.in",
  "power3.out",
  "power3.inOut",
  "power4.in",
  "power4.out",
  "power4.inOut",
  "back.in",
  "back.out",
  "back.inOut",
  "elastic.in",
  "elastic.out",
  "elastic.inOut",
  "bounce.in",
  "bounce.out",
  "bounce.inOut",
  "circ.inOut",
  "expo.in",
  "expo.out",
  "expo.inOut",
  "elastic.out(1,0.3)",
  "elastic.inOut(1,0.3)",
  "spring-gentle",
  "spring-bouncy",
  "spring-stiff",
  "spring-wobbly",
  "spring-heavy",
  "hold",
  "steps(1)"
];
export {
  BUILTIN_VAR_KEYS,
  DROPPED_VAR_KEYS,
  EXTRAS_KEYS,
  GSAP_DEFAULT_DURATION,
  PROPERTY_GROUPS,
  SUPPORTED_EASES,
  SUPPORTED_PROPS,
  classifyPropertyGroup,
  classifyTweenPropertyGroup,
  holdScope,
  isTweenConfigKey,
  isXYPositionWrite,
  keyframeHoldForAnimation
};
