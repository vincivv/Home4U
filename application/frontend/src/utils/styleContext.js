const BUILTIN_STYLE_CONTEXTS = {
  modern: {
    name: 'Modern',
    description: 'Clean lines, minimal decor, neutral colors with bold accents.',
    themeMode: 'minimal',
    materialMode: 'stone',
  },
  traditional: {
    name: 'Traditional',
    description: 'Classic elegance with rich colors, ornate details, and quality craftsmanship.',
    themeMode: 'editorial',
    materialMode: 'walnut',
  },
  scandinavian: {
    name: 'Scandinavian',
    description: 'Cozy minimalism with natural materials, light colors, and a calm hygge atmosphere.',
    themeMode: 'minimal',
    materialMode: 'soft',
  },
  industrial: {
    name: 'Industrial',
    description: 'Raw materials, bold textures, and urban-inspired spaces with character.',
    themeMode: 'story',
    materialMode: 'stone',
  },
  bohemian: {
    name: 'Bohemian',
    description: 'Eclectic layers, expressive color, and collected pieces with texture.',
    themeMode: 'editorial',
    materialMode: 'soft',
  },
  midcentury: {
    name: 'Mid-Century',
    description: 'Retro sophistication with warm woods, organic curves, and bold accents.',
    themeMode: 'editorial',
    materialMode: 'walnut',
  },
  mediterranean: {
    name: 'Mediterranean',
    description: 'Warm, inviting interiors with terracotta, arches, and rustic texture.',
    themeMode: 'story',
    materialMode: 'soft',
  },
  japanese: {
    name: 'Japanese',
    description: 'Serene simplicity with natural materials, low profiles, and calm balance.',
    themeMode: 'minimal',
    materialMode: 'walnut',
  },
  minimalist: {
    name: 'Minimalist',
    description: 'Quiet, functional spaces with hidden storage and deliberate restraint.',
    themeMode: 'minimal',
    materialMode: 'stone',
  },
  farmhouse: {
    name: 'Farmhouse',
    description: 'Comfort-first interiors with reclaimed wood, soft neutrals, and vintage texture.',
    themeMode: 'story',
    materialMode: 'walnut',
  },
};

const styleSlug = (value = '') => (
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
);

const canonicalStyleKey = (value = '') => {
  const normalized = styleSlug(value).replace(/-/g, '');
  if (!normalized) return '';
  if (normalized.includes('midcentury')) return 'midcentury';
  if (normalized.includes('scandinav')) return 'scandinavian';
  if (normalized.includes('mediterr')) return 'mediterranean';
  if (normalized.includes('industr')) return 'industrial';
  if (normalized.includes('bohem')) return 'bohemian';
  if (normalized.includes('minimal')) return 'minimalist';
  if (normalized.includes('farm')) return 'farmhouse';
  if (normalized.includes('japan') || normalized.includes('zen')) return 'japanese';
  if (normalized.includes('trad') || normalized.includes('classic')) return 'traditional';
  if (normalized.includes('modern')) return 'modern';
  return normalized;
};

const humanizeStyleName = (value = '') => {
  const slug = styleSlug(value);
  if (!slug) return '';
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
};

const serializeStyleContext = (style) => {
  if (!style) return null;

  const slug = styleSlug(style.slug || style.name || '');
  return {
    id: style.id ?? null,
    slug,
    name: style.name || humanizeStyleName(slug),
    description: style.description || '',
    signature: style.signature || '',
    materials: Array.isArray(style.materials) ? style.materials.slice(0, 4) : [],
  };
};

const resolveStyleContext = ({
  styleKey = '',
  style = null,
  defaultName = 'Current Style',
  defaultDescription = 'AI will adapt this style to your room layout.',
} = {}) => {
  const serializedStyle = style ? serializeStyleContext(style) : null;
  const sourceValue = serializedStyle?.slug || serializedStyle?.name || styleKey;
  const key = canonicalStyleKey(sourceValue);
  const builtIn = BUILTIN_STYLE_CONTEXTS[key] || null;
  const name = serializedStyle?.name || builtIn?.name || humanizeStyleName(styleKey) || defaultName;
  const description = serializedStyle?.description
    || builtIn?.description
    || (name !== defaultName
      ? `AI will adapt the ${name} direction to your room layout.`
      : defaultDescription);

  return {
    key: key || styleSlug(sourceValue),
    name,
    description,
    themeMode: builtIn?.themeMode || 'story',
    materialMode: builtIn?.materialMode || 'walnut',
    hasExplicitStyle: Boolean(serializedStyle?.slug || styleSlug(styleKey)),
  };
};

export {
  BUILTIN_STYLE_CONTEXTS,
  canonicalStyleKey,
  humanizeStyleName,
  resolveStyleContext,
  serializeStyleContext,
  styleSlug,
};
