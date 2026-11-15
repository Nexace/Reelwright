// A small JSON-Schema subset for per-run props (the Reelwright counterpart of Remotion's Zod `schema`): props.schema.json next to project.json.
//   type (string number integer boolean object array null, or a list), enum, const, minimum, maximum, minLength, maxLength, pattern, format ("color"),
//   required, properties, additionalProperties (false | schema), items, minItems, maxItems, default.
// validate(schema, value) → [{ path, message }]   (empty = fine)        withDefaults(schema, value) → value with every missing property's default filled in
const COLOR = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|hsl)a?\([^)]*\)|[a-z]+)$/i;
const kind = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
const isType = (v, t) => (t === "number" ? typeof v === "number" && Number.isFinite(v) : t === "integer" ? Number.isInteger(v) : kind(v) === t || (t === "integer" && Number.isInteger(v)));

export function validate(schema, value, at = "$") {
  const out = [], bad = (message, p = at) => out.push({ path: p, message });
  if (!schema || typeof schema !== "object") return out;
  if (schema.type) { const ts = [].concat(schema.type); if (!ts.some((t) => isType(value, t))) return [{ path: at, message: `expected ${ts.join(" | ")}, got ${kind(value)}` }]; }
  if ("const" in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) bad(`must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) bad(`must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(", ")}`);
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) bad(`must be >= ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) bad(`must be <= ${schema.maximum}`);
  }
  if (typeof value === "string") {
    if (schema.minLength != null && value.length < schema.minLength) bad(`must have at least ${schema.minLength} characters`);
    if (schema.maxLength != null && value.length > schema.maxLength) bad(`must have at most ${schema.maxLength} characters`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) bad(`must match ${schema.pattern}`);
    if (schema.format === "color" && !COLOR.test(value.trim())) bad("must be a colour");
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) bad(`needs at least ${schema.minItems} items`);
    if (schema.maxItems != null && value.length > schema.maxItems) bad(`needs at most ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => out.push(...validate(schema.items, v, `${at}[${i}]`)));
  }
  if (kind(value) === "object") {
    for (const k of schema.required || []) if (!(k in value)) bad(`is required`, `${at}.${k}`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties?.[k]) out.push(...validate(schema.properties[k], v, `${at}.${k}`));
      else if (schema.additionalProperties === false) bad("is not declared in the schema", `${at}.${k}`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") out.push(...validate(schema.additionalProperties, v, `${at}.${k}`));
    }
  }
  return out;
}

export function withDefaults(schema, value) {
  if (!schema || kind(value) !== "object" || !schema.properties) return value;
  const o = { ...value };
  for (const [k, s] of Object.entries(schema.properties)) {
    if (!(k in o) && "default" in s) o[k] = s.default;
    else if (k in o) o[k] = withDefaults(s, o[k]);
  }
  return o;
}

// the schema props.schema.json would hold for a project's composition variables (type map: string/font/image/color → string, enum → enum)
export function schemaFromVariables(decls) {
  const t = { string: "string", color: "string", font: ["string", "object"], image: ["string", "object"], number: "number", boolean: "boolean", enum: "string" };
  const properties = {};
  for (const d of decls || []) {
    properties[d.id] = { type: t[d.type] ?? "string", ...(d.type === "color" ? { format: "color" } : {}), ...(d.type === "enum" ? { enum: (d.options || []).map((o) => (o && typeof o === "object" ? o.value : o)) } : {}), ...(d.default !== undefined ? { default: d.default } : {}), ...(d.label ? { title: d.label } : {}) };
  }
  return { $schema: "http://json-schema.org/draft-07/schema#", type: "object", properties, additionalProperties: false };
}
