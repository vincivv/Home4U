const DEFAULT_BUDGETS = {
  low: 900,
  medium: 2600,
  high: 6500,
};

const STYLE_POSTER_PALETTES = {
  modern: { accent: '#5f7483', accentSoft: 'rgba(95, 116, 131, 0.2)', panel: 'rgba(20, 28, 33, 0.78)' },
  traditional: { accent: '#8c6a57', accentSoft: 'rgba(140, 106, 87, 0.22)', panel: 'rgba(38, 28, 24, 0.8)' },
  scandinavian: { accent: '#9aa69e', accentSoft: 'rgba(154, 166, 158, 0.22)', panel: 'rgba(35, 42, 39, 0.78)' },
  industrial: { accent: '#8b7661', accentSoft: 'rgba(139, 118, 97, 0.22)', panel: 'rgba(28, 31, 34, 0.82)' },
  bohemian: { accent: '#b3835a', accentSoft: 'rgba(179, 131, 90, 0.24)', panel: 'rgba(51, 36, 28, 0.8)' },
  midcentury: { accent: '#a58b67', accentSoft: 'rgba(165, 139, 103, 0.24)', panel: 'rgba(43, 34, 25, 0.8)' },
  mediterranean: { accent: '#c69463', accentSoft: 'rgba(198, 148, 99, 0.24)', panel: 'rgba(48, 36, 27, 0.8)' },
  japanese: { accent: '#93846a', accentSoft: 'rgba(147, 132, 106, 0.22)', panel: 'rgba(31, 29, 25, 0.82)' },
  minimalist: { accent: '#8e989d', accentSoft: 'rgba(142, 152, 157, 0.2)', panel: 'rgba(23, 27, 29, 0.82)' },
  farmhouse: { accent: '#9f8f7d', accentSoft: 'rgba(159, 143, 125, 0.24)', panel: 'rgba(39, 33, 28, 0.8)' },
  default: { accent: '#a58b67', accentSoft: 'rgba(165, 139, 103, 0.22)', panel: 'rgba(28, 32, 35, 0.8)' },
};

// Per-style grade layers: primary color/mode drives the look, secondary adds depth.
const STYLE_GRADES = {
  modern:        { primary: 'rgba(170, 205, 240, 0.32)', mode: 'screen',   secondary: 'rgba(140, 170, 210, 0.14)', mode2: 'overlay' },
  scandinavian:  { primary: 'rgba(255, 248, 225, 0.30)', mode: 'screen',   secondary: 'rgba(200, 195, 170, 0.14)', mode2: 'overlay' },
  industrial:    { primary: 'rgba(110, 90,  68,  0.28)', mode: 'multiply', secondary: 'rgba(180, 155, 120, 0.16)', mode2: 'screen'  },
  bohemian:      { primary: 'rgba(225, 138, 60,  0.32)', mode: 'screen',   secondary: 'rgba(200, 120, 55,  0.16)', mode2: 'overlay' },
  midcentury:    { primary: 'rgba(210, 168, 78,  0.30)', mode: 'screen',   secondary: 'rgba(185, 145, 70,  0.15)', mode2: 'overlay' },
  mediterranean: { primary: 'rgba(228, 125, 58,  0.34)', mode: 'screen',   secondary: 'rgba(200, 110, 55,  0.16)', mode2: 'overlay' },
  japandi:       { primary: 'rgba(225, 212, 188, 0.26)', mode: 'screen',   secondary: 'rgba(160, 148, 122, 0.13)', mode2: 'overlay' },
  japanese:      { primary: 'rgba(232, 218, 190, 0.24)', mode: 'screen',   secondary: 'rgba(150, 138, 112, 0.12)', mode2: 'overlay' },
  minimalist:    { primary: 'rgba(252, 252, 250, 0.34)', mode: 'screen',   secondary: 'rgba(220, 220, 218, 0.16)', mode2: 'overlay' },
  farmhouse:     { primary: 'rgba(218, 192, 155, 0.28)', mode: 'screen',   secondary: 'rgba(175, 150, 118, 0.14)', mode2: 'overlay' },
  traditional:   { primary: 'rgba(185, 148, 94,  0.28)', mode: 'screen',   secondary: 'rgba(160, 128, 82,  0.14)', mode2: 'overlay' },
  coastal:       { primary: 'rgba(145, 198, 225, 0.30)', mode: 'screen',   secondary: 'rgba(115, 170, 200, 0.15)', mode2: 'overlay' },
  default:       { primary: 'rgba(205, 188, 155, 0.26)', mode: 'screen',   secondary: 'rgba(175, 160, 130, 0.14)', mode2: 'overlay' },
};

const getBudgetAmount = (tier = 'medium') => DEFAULT_BUDGETS[tier] || DEFAULT_BUDGETS.medium;

const getPosterPalette = (styleKey = '') => STYLE_POSTER_PALETTES[styleKey] || STYLE_POSTER_PALETTES.default;

const ROOM_UPLOAD_TARGET_MAX_BYTES = 20 * 1024 * 1024;
const ROOM_UPLOAD_SOURCE_MAX_BYTES = 40 * 1024 * 1024;
const ROOM_UPLOAD_MAX_DIMENSION = 2048;

const supportsCanvas = () => {
  const canvas = document.createElement('canvas');
  return typeof canvas.getContext === 'function';
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  if (!String(src || '').startsWith('data:')) {
    image.crossOrigin = 'anonymous';
  }
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => resolve(event.target?.result || '');
  reader.onerror = () => reject(new Error('READ_FAILED'));
  reader.readAsDataURL(file);
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) {
      resolve(blob);
      return;
    }
    reject(new Error('ENCODE_FAILED'));
  }, type, quality);
});

const formatByteLabel = (size) => {
  const megabytes = size / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
  return `${Math.round(size / 1024)} KB`;
};

const extensionForType = (type, fallbackName = 'room-image') => {
  if (type === 'image/png') return '.png';
  if (type === 'image/webp') return '.webp';
  if (type === 'image/jpeg') return '.jpg';
  const name = String(fallbackName || '');
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex) : '.jpg';
};

const filenameForNormalizedAsset = (name, type) => {
  const baseName = String(name || 'room-image').replace(/\.[^.]+$/, '');
  return `${baseName}-optimized${extensionForType(type, name)}`;
};

const drawCoverImage = (ctx, image, width, height) => {
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
  }

  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
};

const inferDetectedTags = (profile = null) => {
  if (!profile) return [];

  const inferred = new Set();
  if (profile.average_brightness >= 0.62) {
    inferred.add('neutral');
    inferred.add('white');
    inferred.add('light-wood');
  }
  if (profile.average_brightness <= 0.35) {
    inferred.add('rich-colors');
    inferred.add('walnut');
  }
  if (profile.average_saturation >= 0.56) {
    inferred.add('colorful');
    inferred.add('patterns');
  }
  if (profile.average_saturation <= 0.24) {
    inferred.add('monochrome');
    inferred.add('clean');
    inferred.add('simple');
  }
  if (profile.warmth_bias >= 0.1) {
    inferred.add('cozy');
    inferred.add('natural');
  }
  if (profile.warmth_bias <= -0.1) {
    inferred.add('sleek');
    inferred.add('geometric');
    inferred.add('contemporary');
  }

  return Array.from(inferred);
};

const normalizeRoomUpload = async (
  file,
  {
    targetMaxBytes = ROOM_UPLOAD_TARGET_MAX_BYTES,
    maxSourceBytes = ROOM_UPLOAD_SOURCE_MAX_BYTES,
    maxDimension = ROOM_UPLOAD_MAX_DIMENSION,
  } = {},
) => {
  if (!file) throw new Error('NO_FILE');
  if (file.size > maxSourceBytes) throw new Error('SOURCE_TOO_LARGE');

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const shouldResize = Math.max(image.width || 0, image.height || 0) > maxDimension;
    if (file.size <= targetMaxBytes && !shouldResize) {
      return {
        file,
        previewUrl: await readFileAsDataUrl(file),
        optimized: false,
        notice: '',
      };
    }

    if (!supportsCanvas()) throw new Error('CANVAS_UNAVAILABLE');

    const preferredTypes = file.type === 'image/png'
      ? ['image/webp', 'image/png', 'image/jpeg']
      : file.type === 'image/webp'
        ? ['image/webp', 'image/jpeg']
        : ['image/jpeg', 'image/webp'];
    const qualitySteps = [0.92, 0.86, 0.8, 0.74, 0.68, 0.6];

    let width = image.width || maxDimension;
    let height = image.height || maxDimension;
    if (Math.max(width, height) > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CANVAS_UNAVAILABLE');

    let bestBlob = null;
    let bestType = preferredTypes[0];
    let attemptWidth = width;
    let attemptHeight = height;

    while (true) {
      canvas.width = attemptWidth;
      canvas.height = attemptHeight;
      ctx.clearRect(0, 0, attemptWidth, attemptHeight);
      ctx.drawImage(image, 0, 0, attemptWidth, attemptHeight);

      for (const type of preferredTypes) {
        if (type === 'image/png') {
          const blob = await canvasToBlob(canvas, type);
          if (!bestBlob || blob.size < bestBlob.size) {
            bestBlob = blob;
            bestType = type;
          }
          if (blob.size <= targetMaxBytes) {
            const normalizedFile = new File(
              [blob],
              filenameForNormalizedAsset(file.name, type),
              { type, lastModified: file.lastModified },
            );
            return {
              file: normalizedFile,
              previewUrl: await readFileAsDataUrl(normalizedFile),
              optimized: true,
              notice: `Large image optimized from ${formatByteLabel(file.size)} to ${formatByteLabel(blob.size)} for upload.`,
            };
          }
          continue;
        }

        for (const quality of qualitySteps) {
          const blob = await canvasToBlob(canvas, type, quality);
          if (!bestBlob || blob.size < bestBlob.size) {
            bestBlob = blob;
            bestType = type;
          }
          if (blob.size <= targetMaxBytes) {
            const normalizedFile = new File(
              [blob],
              filenameForNormalizedAsset(file.name, type),
              { type, lastModified: file.lastModified },
            );
            return {
              file: normalizedFile,
              previewUrl: await readFileAsDataUrl(normalizedFile),
              optimized: true,
              notice: `Large image optimized from ${formatByteLabel(file.size)} to ${formatByteLabel(blob.size)} for upload.`,
            };
          }
        }
      }

      if (Math.max(attemptWidth, attemptHeight) < 960) {
        break;
      }

      attemptWidth = Math.max(1, Math.round(attemptWidth * 0.85));
      attemptHeight = Math.max(1, Math.round(attemptHeight * 0.85));
    }

    if (bestBlob) {
      const normalizedFile = new File(
        [bestBlob],
        filenameForNormalizedAsset(file.name, bestType),
        { type: bestType, lastModified: file.lastModified },
      );
      if (normalizedFile.size <= targetMaxBytes) {
        return {
          file: normalizedFile,
          previewUrl: await readFileAsDataUrl(normalizedFile),
          optimized: true,
          notice: `Large image optimized from ${formatByteLabel(file.size)} to ${formatByteLabel(bestBlob.size)} for upload.`,
        };
      }
    }

    throw new Error('OPTIMIZE_FAILED');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const extractImageProfile = async (sourceUrl) => {
  if (!sourceUrl) return null;

  try {
    const image = await loadImage(sourceUrl);
    const width = image.naturalWidth || image.width || 0;
    const height = image.naturalHeight || image.height || 0;
    const profile = {
      width,
      height,
      aspect_ratio: width && height ? Number((width / height).toFixed(3)) : 1,
      average_brightness: 0.5,
      average_saturation: 0.4,
      warmth_bias: 0,
      dominant_hex: '#b0a79b',
    };

    if (!supportsCanvas()) return profile;

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 32;
    sampleCanvas.height = 32;
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx) return profile;

    ctx.drawImage(image, 0, 0, sampleCanvas.width, sampleCanvas.height);
    const { data } = ctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
    let totalBrightness = 0;
    let totalSaturation = 0;
    let totalWarmth = 0;
    let totalRed = 0;
    let totalGreen = 0;
    let totalBlue = 0;
    let count = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255;
      if (alpha <= 0) continue;
      const red = data[index] / 255;
      const green = data[index + 1] / 255;
      const blue = data[index + 2] / 255;
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const brightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

      totalBrightness += brightness;
      totalSaturation += saturation;
      totalWarmth += red - blue;
      totalRed += red;
      totalGreen += green;
      totalBlue += blue;
      count += 1;
    }

    if (count === 0) return profile;

    const averageRed = Math.round((totalRed / count) * 255);
    const averageGreen = Math.round((totalGreen / count) * 255);
    const averageBlue = Math.round((totalBlue / count) * 255);

    return {
      ...profile,
      average_brightness: Number((totalBrightness / count).toFixed(3)),
      average_saturation: Number((totalSaturation / count).toFixed(3)),
      warmth_bias: Number((totalWarmth / count).toFixed(3)),
      dominant_hex: `#${[averageRed, averageGreen, averageBlue].map((value) => value.toString(16).padStart(2, '0')).join('')}`,
    };
  } catch {
    return null;
  }
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

const renderWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines) => {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }
    if (currentLine) lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  lines.slice(0, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
};

const renderConceptPreview = async ({ sourceUrl, analysis, styleInfo }) => {
  if (!sourceUrl || !analysis) return sourceUrl;

  try {
    let image = null;
    try { image = await loadImage(sourceUrl); } catch { image = null; }
    if (!supportsCanvas()) return sourceUrl;

    const W = 1280;
    const H = 720;
    const SPLIT = 618;  // x where Before ends
    const GAP   = 6;    // divider width

    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceUrl;

    const palette = getPosterPalette(styleInfo?.key);
    const grade   = STYLE_GRADES[styleInfo?.key] || STYLE_GRADES.default;

    const drawBase = () => {
      if (image) {
        drawCoverImage(ctx, image, W, H);
      } else {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#cec5b8');
        g.addColorStop(1, '#a89070');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    };

    // ── LEFT: BEFORE ──────────────────────────────────────────────
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, SPLIT, H); ctx.clip();
    drawBase();
    // Desaturate slightly so "before" feels flatter than "after"
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, SPLIT, H);
    ctx.restore();

    // ── RIGHT: AFTER ──────────────────────────────────────────────
    const afterX = SPLIT + GAP;
    const afterW = W - afterX;
    ctx.save();
    ctx.beginPath(); ctx.rect(afterX, 0, afterW, H); ctx.clip();
    drawBase();

    // Primary style grade
    ctx.globalCompositeOperation = grade.mode;
    ctx.fillStyle = grade.primary;
    ctx.fillRect(afterX, 0, afterW, H);

    // Secondary depth layer
    ctx.globalCompositeOperation = grade.mode2;
    ctx.fillStyle = grade.secondary;
    ctx.fillRect(afterX, 0, afterW, H);

    ctx.globalCompositeOperation = 'source-over';

    // Radial vignette for depth
    const vigCx = afterX + afterW / 2;
    const vig = ctx.createRadialGradient(vigCx, H / 2, H * 0.18, vigCx, H / 2, H * 0.82);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(afterX, 0, afterW, H);

    // Bottom fade for text readability
    const fade = ctx.createLinearGradient(0, H - 220, 0, H);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = fade;
    ctx.fillRect(afterX, H - 220, afterW, 220);

    ctx.restore();

    // ── DIVIDER ───────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.90)';
    ctx.fillRect(SPLIT, 0, GAP, H);

    // Center drag handle
    const hCy = H / 2;
    ctx.beginPath();
    ctx.arc(SPLIT + GAP / 2, hCy, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 15px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⟷', SPLIT + GAP / 2, hCy + 5);
    ctx.textAlign = 'left';

    // ── BEFORE LABEL ─────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    roundRect(ctx, 18, 18, 96, 34, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    ctx.font = '700 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('BEFORE', 30, 40);

    // ── AFTER LABEL ──────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    roundRect(ctx, afterX + 18, 18, 90, 34, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('AFTER', afterX + 30, 40);

    // ── AI CALLOUT PILLS (right side, top) ───────────────────────
    const matchingAspects = (analysis.matching_aspects || []).slice(0, 2);
    const gapAspects      = (analysis.gap_aspects      || []).slice(0, 2);
    ctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';

    let pillY = 72;
    matchingAspects.forEach((aspect) => {
      const label = `✓  ${aspect}`;
      const tw = Math.min(ctx.measureText(label).width + 24, afterW - 36);
      roundRect(ctx, afterX + 18, pillY, tw, 28, 14);
      ctx.fillStyle = 'rgba(0, 45, 28, 0.75)';
      ctx.fill();
      ctx.fillStyle = '#7ecfb8';
      ctx.fillText(label, afterX + 30, pillY + 19);
      pillY += 36;
    });
    gapAspects.forEach((aspect) => {
      const label = `→  ${aspect}`;
      const tw = Math.min(ctx.measureText(label).width + 24, afterW - 36);
      roundRect(ctx, afterX + 18, pillY, tw, 28, 14);
      ctx.fillStyle = 'rgba(45, 22, 0, 0.75)';
      ctx.fill();
      ctx.fillStyle = '#e8a870';
      ctx.fillText(label, afterX + 30, pillY + 19);
      pillY += 36;
    });

    // Fallback: top tags if no AI aspects
    if (matchingAspects.length === 0 && gapAspects.length === 0) {
      ctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';
      (analysis.suggested_tags || []).slice(0, 3).forEach((tag) => {
        const label = `${tag.name}  ${Math.round(tag.confidence * 100)}%`;
        const tw = Math.min(ctx.measureText(label).width + 24, afterW - 36);
        roundRect(ctx, afterX + 18, pillY, tw, 28, 14);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.fillText(label, afterX + 30, pillY + 19);
        pillY += 36;
      });
    }

    // ── STYLE NAME + SCORE (right bottom) ────────────────────────
    const selectedScore = analysis.style_scores?.find((s) => s.style_name === analysis.selected_style?.name)
      || analysis.style_scores?.[0];
    const styleName = analysis.selected_style?.name || styleInfo?.name || 'Style';

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 38px Georgia, serif';
    ctx.fillText(styleName, afterX + 24, H - 72);

    ctx.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = palette.accent;
    ctx.fillText(`${Math.round(selectedScore?.score_value || 0)}% match`, afterX + 24, H - 40);

    // Priority move tag bottom-right
    const topRec = (analysis.recommendations || [])[0];
    if (topRec) {
      ctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';
      const recLabel = topRec.description.length > 60
        ? topRec.description.slice(0, 57) + '…'
        : topRec.description;
      const recW = Math.min(ctx.measureText(recLabel).width + 28, afterW - 36);
      roundRect(ctx, afterX + 24, H - 112, recW, 28, 14);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(recLabel, afterX + 38, H - 93);
    }

    // ── BEFORE: summary text (left bottom) ───────────────────────
    const leftFade = ctx.createLinearGradient(0, H - 140, 0, H);
    leftFade.addColorStop(0, 'rgba(0,0,0,0)');
    leftFade.addColorStop(1, 'rgba(0,0,0,0.68)');
    ctx.fillStyle = leftFade;
    ctx.fillRect(0, H - 140, SPLIT, 140);

    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.font = '500 14px ui-sans-serif, system-ui, sans-serif';
    renderWrappedText(ctx, analysis.summary || '', 20, H - 52, SPLIT - 40, 22, 2);

    return canvas.toDataURL('image/png');
  } catch {
    return sourceUrl;
  }
};

export {
  DEFAULT_BUDGETS,
  extractImageProfile,
  getBudgetAmount,
  inferDetectedTags,
  normalizeRoomUpload,
  renderConceptPreview,
  ROOM_UPLOAD_SOURCE_MAX_BYTES,
  ROOM_UPLOAD_TARGET_MAX_BYTES,
};
