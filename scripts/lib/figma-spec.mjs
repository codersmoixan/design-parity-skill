// Build figma-spec.json from a Figma REST "GET /v1/files/:key/nodes" response.
import { CliError } from './args.mjs';
import { figmaMotionSpecs } from './figma-motion.mjs';
import { discoverFigmaStates } from './state-discovery.mjs';

const LAYER_KEYS = [
  'absoluteBoundingBox', 'visible', 'fills', 'strokes', 'strokeWeight', 'cornerRadius', 'rectangleCornerRadii',
  'effects', 'opacity', 'layoutMode', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'paddingLeft',
  'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'layoutSizingHorizontal', 'layoutSizingVertical',
  'style', 'characters', 'characterStyleOverrides', 'styleOverrideTable', 'componentId', 'componentName',
  'variantProperties', 'boundVariables', 'reactions', 'annotations', 'description', 'transitionNodeID',
  'transitionDuration', 'transitionEasing', 'flowStartingPoints',
];
const STYLE_KEYS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeightPx', 'letterSpacing', 'textCase', 'textAlignHorizontal'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const figmaColor = (c, opacity = 1) => {
  if (!isObj(c)) return null;
  const ch = (v) => Math.max(0, Math.min(255, Math.round((Number(v) || 0) * 255)));
  const a = Math.round(((c.a ?? 1) * (opacity ?? 1)) * 100) / 100;
  return `rgba(${ch(c.r)}, ${ch(c.g)}, ${ch(c.b)}, ${a})`;
};

const solidPaint = (paints) => {
  const visible = Array.isArray(paints) ? paints.filter((p) => isObj(p) && p.visible !== false) : [];
  return visible.length === 1 && visible[0].type === 'SOLID' && isObj(visible[0].color) ? visible[0] : null;
};

/**
 * Character-level style runs on a Figma TEXT layer (characterStyleOverrides + styleOverrideTable).
 * Mixed fills (a link colour inside a sentence) live here — the node-level `fills` alone is wrong.
 * → { mixed, runs: [{ start, end, text, overrideKey, color, style, fillTokenId }], unknownMixed } | null.
 */
export function textStyleRuns(layer) {
  if (!layer || layer.type !== 'TEXT' || typeof layer.characters !== 'string') return null;
  const chars = layer.characters;
  if (!chars.length) return null;
  const overrides = Array.isArray(layer.characterStyleOverrides) ? layer.characterStyleOverrides : [];
  const table = isObj(layer.styleOverrideTable) ? layer.styleOverrideTable : {};
  const rangeFillVars = Array.isArray(layer.boundVariables?.textRangeFills) ? layer.boundVariables.textRangeFills : [];
  const hasOverrides = overrides.some((k) => Number(k) > 0) && Object.keys(table).length > 0;
  // Spec kept textRangeFills but dropped character overrides (older fetch): still flag mixed.
  if (!hasOverrides) {
    if (rangeFillVars.length > 1) return { mixed: true, unknownMixed: true, runs: [] };
    return null;
  }
  const idxAt = (i) => {
    if (i >= overrides.length) return 0;
    const n = Number(overrides[i]);
    return Number.isFinite(n) ? n : 0;
  };
  const baseStyle = isObj(layer.style) ? layer.style : {};
  const baseFills = layer.fills;
  const baseFillToken = Array.isArray(layer.boundVariables?.fills)
    ? layer.boundVariables.fills[0]?.id
    : layer.boundVariables?.fills?.id ?? null;
  const runs = [];
  let start = 0;
  let cur = idxAt(0);
  const pushRun = (end) => {
    const override = cur === 0 ? null : table[String(cur)] ?? table[cur] ?? null;
    const fills = override && Array.isArray(override.fills) ? override.fills : baseFills;
    const fill = solidPaint(fills);
    const style = { ...baseStyle };
    if (override) {
      for (const k of STYLE_KEYS) if (override[k] !== undefined) style[k] = override[k];
    }
    const fillTokenId =
      (override && (Array.isArray(override.boundVariables?.fills) ? override.boundVariables.fills[0]?.id : override.boundVariables?.fills?.id)) ||
      (cur === 0 ? baseFillToken : null) ||
      null;
    runs.push({
      start,
      end,
      text: chars.slice(start, end),
      overrideKey: cur,
      color: fill ? figmaColor(fill.color, fill.opacity) : null,
      style: pickStyle(style) ?? style,
      fillTokenId,
    });
  };
  for (let i = 1; i <= chars.length; i++) {
    const next = i < chars.length ? idxAt(i) : null;
    if (i === chars.length || next !== cur) {
      pushRun(i);
      start = i;
      cur = next;
    }
  }
  const colors = [...new Set(runs.map((r) => r.color).filter(Boolean))];
  const mixed = colors.length > 1 || runs.some((r) => r.overrideKey !== 0);
  return mixed ? { mixed: true, unknownMixed: false, runs } : { mixed: false, unknownMixed: false, runs };
}

/** "State=Hover, Size=Large" → { State: "Hover", Size: "Large" }; null when not variant-shaped. */
export function parseVariantName(name) {
  const parts = String(name ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const out = {};
  for (const part of parts) {
    const i = part.indexOf('=');
    if (i <= 0) return null;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** Variant properties of a component-set child or an instance (VARIANT component properties). */
export function variantPropertiesOf(node, parent, components = {}) {
  if (node?.componentProperties && typeof node.componentProperties === 'object') {
    const out = {};
    for (const [key, prop] of Object.entries(node.componentProperties)) {
      if (prop && prop.type === 'VARIANT') out[key.replace(/#[^#]*$/, '')] = String(prop.value);
    }
    if (Object.keys(out).length) return out;
  }
  if (node?.type === 'COMPONENT' && parent?.type === 'COMPONENT_SET') return parseVariantName(node.name);
  const comp = node?.componentId ? components[node.componentId] : null;
  if (node?.type === 'INSTANCE' && comp?.componentSetId) return parseVariantName(comp.name);
  return null;
}

function componentNameOf(node, parent, components = {}, componentSets = {}) {
  if (node?.type === 'INSTANCE' && node.componentId) {
    const comp = components[node.componentId];
    if (!comp) return null;
    return (comp.componentSetId && componentSets[comp.componentSetId]?.name) || comp.name || null;
  }
  if (node?.type === 'COMPONENT') return parent?.type === 'COMPONENT_SET' ? parent.name : node.name;
  if (node?.type === 'COMPONENT_SET') return node.name;
  return null;
}

/** Depth-first flattened layer list with the properties design QA compares. */
export function flattenLayers(root, { components = {}, componentSets = {} } = {}) {
  const layers = [];
  const walk = (node, parent, parentPath, depth) => {
    if (!node || typeof node !== 'object') return;
    const layerPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const derived = {
      visible: node.visible !== false,
      style: pickStyle(node.style),
      componentName: componentNameOf(node, parent, components, componentSets),
      variantProperties: variantPropertiesOf(node, parent, components),
      description:
        node.description ??
        ((node.type === 'COMPONENT' && components[node.id]?.description) ||
          (node.type === 'COMPONENT_SET' && componentSets[node.id]?.description) ||
          undefined),
    };
    const layer = { id: node.id, name: node.name, type: node.type, path: layerPath, depth };
    for (const key of LAYER_KEYS) {
      const value = Object.prototype.hasOwnProperty.call(derived, key) ? derived[key] : node[key];
      if (value !== undefined && value !== null && !(key === 'description' && value === '')) layer[key] = value;
    }
    if (layer.type === 'TEXT') {
      const tr = textStyleRuns(layer);
      if (tr?.runs?.length) layer.textRuns = tr.runs;
      if (tr?.mixed) layer.mixedTextStyles = true;
      if (tr?.unknownMixed) layer.mixedTextStylesUnknown = true;
    }
    layers.push(layer);
    for (const child of node.children || []) walk(child, node, layerPath, depth + 1);
  };
  walk(root, null, '', 0);
  return layers;
}

function pickStyle(style) {
  if (!style || typeof style !== 'object') return undefined;
  const out = {};
  for (const k of STYLE_KEYS) if (style[k] !== undefined) out[k] = style[k];
  return Object.keys(out).length ? out : undefined;
}

/**
 * figma-spec.json content.
 * input: { fileKey, nodeId, url, response (nodes endpoint JSON), variables, siblings, degradations, now }
 */
export function buildFigmaSpec({ fileKey, nodeId, url, response, variables = null, siblings = [], degradations = [], now = new Date() }) {
  const entry = response?.nodes?.[nodeId];
  if (!entry || !entry.document) {
    throw new CliError(`node ${nodeId} was not found in Figma file ${fileKey} (check the link's node-id and that the token can open the file)`, 1);
  }
  const doc = entry.document;
  const box = doc.absoluteBoundingBox || doc.absoluteRenderBounds || {};
  const spec = {
    fileKey,
    nodeId,
    url,
    fileName: response.name ?? null,
    lastModified: response.lastModified ?? null,
    version: response.version ?? null,
    name: doc.name,
    type: doc.type,
    frame: { width: Math.round(box.width ?? 0), height: Math.round(box.height ?? 0) },
    layers: flattenLayers(doc, entry),
    components: entry.components ?? {},
    componentSets: entry.componentSets ?? {},
    styles: entry.styles ?? {},
    variables,
    siblings,
    states: [],
    motion: [],
    exports: [],
    fetchedAt: now.toISOString(),
    degradations,
  };
  spec.states = discoverFigmaStates(spec);
  // Prototype transitions (reactions[].actions[].transition) as CSS-comparable specs.
  spec.motion = figmaMotionSpecs(spec);
  return spec;
}

/**
 * Top-level frames that share the page with nodeId (from GET /v1/files/:key?depth=2).
 * Returns [] when the node is nested deeper than a page's direct children.
 */
export function siblingFrames(fileResponse, nodeId) {
  for (const page of fileResponse?.document?.children || []) {
    const kids = page.children || [];
    if (!kids.some((k) => k.id === nodeId)) continue;
    return kids
      .filter((k) => k.id !== nodeId)
      .map((k) => ({ id: k.id, name: k.name, type: k.type, absoluteBoundingBox: k.absoluteBoundingBox ?? null }));
  }
  return [];
}
