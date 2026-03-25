export interface GenericElement {
  tag?: string;
  type?: string;
  className?: string;
  class?: string;
  children?: string | GenericElement[];
  props?: Record<string, unknown>;
  text?: string;
  content?: string;
  [key: string]: unknown;
}

export function isValidGenericElement(obj: unknown): obj is GenericElement {
  if (typeof obj !== 'object' || obj === null) return false;
  const el = obj as Record<string, unknown>;
  const hasTag = typeof el.tag === 'string';
  const hasType = typeof el.type === 'string';
  
  if (!hasTag && !hasType) {
    const keys = Object.keys(el);
    if (keys.length === 0) return false;
    if (typeof el.text === 'string' || typeof el.content === 'string') return true;
    return keys.some(k => ['className', 'class', 'children', 'props', 'label', 'placeholder', 'src', 'href'].includes(k));
  }
  return true;
}

export function isValidGenericSchema(obj: unknown): obj is { components: GenericElement[] } {
  if (typeof obj !== 'object' || obj === null) return false;
  const schema = obj as Record<string, unknown>;
  if (!Array.isArray(schema.components)) return false;
  return schema.components.every(isValidGenericElement);
}

export const htmlTags = [
  'div', 'span', 'p', 'a', 'button', 'input', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'select', 'option', 'textarea',
  'img', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside'
];

export const svgTags = [
  'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse',
  'g', 'defs', 'use', 'symbol', 'clipPath', 'linearGradient', 'radialGradient',
  'stop', 'filter', 'feBlend', 'feColorMatrix', 'feGaussianBlur', 'feOffset',
  'feMerge', 'feMorphology', 'feComponentTransfer', 'feFuncA', 'feFuncR', 'feFuncG', 'feFuncB'
];

export const allowedTags = [...htmlTags, ...svgTags];

export const allowedProps = [
  'type', 'placeholder', 'required', 'disabled', 'checked', 'value', 'name', 'id',
  'href', 'src', 'alt', 'title', 'method', 'action', 'for', 'min', 'max', 'step',
  'accept', 'multiple', 'readOnly', 'maxLength', 'minLength', 'pattern',
  'viewBox', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin',
  'fillOpacity', 'strokeOpacity', 'opacity', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y',
  'width', 'height', 'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'preserveAspectRatio',
  'gradientUnits', 'offset', 'stopColor', 'stopOpacity', 'fx', 'fy', 'fr'
];

interface ParseResult {
  success: boolean;
  components?: GenericElement[];
  rawText?: string;
}

export function parseGeminiResponse(response: string): ParseResult {
  const trimmed = response.trim();
  
  let jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  let parsed = null;
  
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
    }
  }
  
  if (!parsed) {
    jsonMatch = trimmed.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
      }
    }
  }
  
  if (parsed) {
    if (isValidGenericSchema(parsed) && Array.isArray(parsed.components)) {
      return { success: true, components: parsed.components };
    }
    
    if (Array.isArray(parsed)) {
      if (parsed.every(isValidGenericElement)) {
        return { success: true, components: parsed };
      }
    }
    
    if (parsed && typeof parsed === 'object' && 'components' in parsed) {
      const components = (parsed as Record<string, unknown>).components;
      if (Array.isArray(components) && components.every(isValidGenericElement)) {
        return { success: true, components };
      }
    }
  }
  
  return { success: false, rawText: response };
}
