/**
 * SVG room visuals and icon renderers for the Virtual Tour experience.
 */
const RoomIcon = ({ name, className = '' }) => {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

  switch (name) {
    case 'bed':
      return (
        <svg className={className} {...common} aria-hidden="true">
          <rect x="3" y="11" width="18" height="7" rx="2" />
          <path d="M3 14h18M6 11V8.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 12 8.5V11M12 11V9.2A1.2 1.2 0 0 1 13.2 8h2.6A1.2 1.2 0 0 1 17 9.2V11" />
        </svg>
      );
    case 'sofa':
      return (
        <svg className={className} {...common} aria-hidden="true">
          <rect x="4" y="10" width="16" height="7" rx="2" />
          <path d="M6 10V8.7A1.7 1.7 0 0 1 7.7 7h2.6A1.7 1.7 0 0 1 12 8.7V10m0 0V8.7A1.7 1.7 0 0 1 13.7 7h2.6A1.7 1.7 0 0 1 18 8.7V10M5 17v2m14-2v2" />
        </svg>
      );
    case 'kitchen':
      return (
        <svg className={className} {...common} aria-hidden="true">
          <rect x="3.5" y="6" width="7.5" height="12" rx="1.5" />
          <rect x="13" y="9" width="7.5" height="9" rx="1.5" />
          <path d="M3.5 12h7.5m13-3h-4m0 0V6m0 3v9" />
        </svg>
      );
    case 'bath':
      return (
        <svg className={className} {...common} aria-hidden="true">
          <path d="M4 12h16v2.2A3.8 3.8 0 0 1 16.2 18H7.8A3.8 3.8 0 0 1 4 14.2V12Z" />
          <path d="M7 12V9.8a2.8 2.8 0 0 1 2.8-2.8h1.4A2.8 2.8 0 0 1 14 9.8V12m-7 6v1m10-1v1" />
        </svg>
      );
    case 'desk':
      return (
        <svg className={className} {...common} aria-hidden="true">
          <rect x="6" y="4.5" width="12" height="8.5" rx="1.5" />
          <path d="M9 18V13m6 5V13M4 18h16M10.5 8.7h3" />
        </svg>
      );
    case 'home':
      return (
        <svg className={className} {...common} aria-hidden="true">
          <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5.4v-6h-3.2v6H5a1 1 0 0 1-1-1v-8.5Z" />
        </svg>
      );
    default:
      return null;
  }
};

const renderRoomIllustration = (roomId) => {
  const baseScene = (content, figureClass, figureExtras = null) => (
    <svg className={`room-scene scene-${roomId}`} viewBox="0 0 640 360" aria-hidden="true">
      <defs>
        <filter id="bloom-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
          <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
          <feFlood floodColor="var(--room-accent)" floodOpacity="0.4" result="offsetColor" />
          <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="86" y="72" width="468" height="228" rx="20" className="scene-shell" />
      <g className="scene-world">
        <polygon points="118,104 522,104 548,126 94,126" className="scene-ceiling" />
        <polygon points="94,126 118,104 118,262 94,286" className="scene-left-wall" />
        <polygon points="522,104 548,126 548,286 522,262" className="scene-right-wall" />
        <polygon points="118,262 522,262 548,286 94,286" className="scene-floor" />
        <rect x="118" y="104" width="404" height="158" rx="10" className="scene-backdrop" />
        <rect x="128" y="112" width="384" height="142" rx="9" className="scene-stage" />
        <path d="M144 132h352M144 148h352" className="scene-soft-lines" />
        <line x1="128" y1="246" x2="512" y2="246" className="scene-floor-line" />
        {content}
        <g className={`scene-figure ${figureClass || ''}`}>
          <circle cx="478" cy="178" r="13" className="scene-person-head" />
          <rect x="468" y="192" width="20" height="34" rx="8" className="scene-person-body" />
          <rect x="465" y="198" width="6" height="17" rx="3" className="scene-arm-left" />
          <rect x="485" y="198" width="6" height="17" rx="3" className="scene-arm-right" />
          <rect x="471" y="224" width="6" height="15" rx="3" className="scene-leg-left" />
          <rect x="481" y="224" width="6" height="15" rx="3" className="scene-leg-right" />
          <g className="scene-handset">
            <rect x="456" y="202" width="10" height="16" rx="3" className="scene-phone" />
            <circle cx="462" cy="210" r="1.7" className="scene-phone-dot" />
          </g>
          {figureExtras}
        </g>
      </g>
    </svg>
  );

  switch (roomId) {
    case 'atrium':
      return baseScene(
        <>
          <rect x="220" y="120" width="200" height="90" rx="10" className="scene-scan-frame" />
          <rect x="194" y="202" width="252" height="34" rx="10" className="scene-card scene-main" />
          <rect x="212" y="178" width="92" height="24" rx="8" className="scene-card scene-soft" />
          <rect x="336" y="178" width="92" height="24" rx="8" className="scene-card scene-soft" />
          <rect x="454" y="128" width="34" height="98" rx="16" className="scene-accent" />
        </>,
        'scene-figure-scan',
        <>
          <circle cx="452" cy="188" r="3.5" className="scene-camera-flash" />
          <line x1="446" y1="176" x2="424" y2="160" className="scene-scan-ray" />
        </>,
      );
    case 'pain':
      return baseScene(
        <>
          <rect x="176" y="192" width="290" height="42" rx="14" className="scene-card scene-main" />
          <rect x="206" y="164" width="90" height="24" rx="8" className="scene-card scene-soft" />
          <rect x="344" y="164" width="90" height="24" rx="8" className="scene-card scene-soft" />
          <ellipse cx="322" cy="262" rx="138" ry="16" className="scene-rug" />
        </>,
        'scene-figure-scroll',
        <>
          <rect x="451" y="204" width="2" height="12" rx="1" className="scene-scroll-indicator" />
          <path d="M446 208c5-2 9-1 13 2" className="scene-scroll-swipe" />
        </>,
      );
    case 'solution':
      return baseScene(
        <>
          <rect x="232" y="188" width="176" height="44" rx="10" className="scene-card scene-main" />
          <rect x="188" y="224" width="36" height="28" rx="7" className="scene-card scene-soft" />
          <rect x="416" y="224" width="36" height="28" rx="7" className="scene-card scene-soft" />
          <rect x="152" y="138" width="72" height="66" rx="8" className="scene-accent" />
          <rect x="238" y="142" width="164" height="34" rx="7" className="scene-screen" />
        </>,
        'scene-figure-place',
        <>
          <rect x="436" y="230" width="18" height="10" rx="3" className="scene-setdown-item" />
          <rect x="420" y="234" width="36" height="4" rx="2" className="scene-setdown-surface" />
        </>,
      );
    case 'transform':
      return baseScene(
        <>
          <rect x="236" y="198" width="168" height="36" rx="10" className="scene-card scene-main" />
          <ellipse cx="320" cy="146" rx="72" ry="38" className="scene-mirror" />
          <rect x="148" y="198" width="82" height="34" rx="17" className="scene-card scene-soft" />
          <rect x="438" y="138" width="48" height="78" rx="8" className="scene-accent" />
          <path d="M284 132c22-16 52-16 74 0" className="scene-soft-lines" />
        </>,
        'scene-figure-box',
        <>
          <rect x="442" y="220" width="20" height="14" rx="2" className="scene-box-body" />
          <path d="M442 220h20l-4-5h-12Z" className="scene-box-lid" />
        </>,
      );
    case 'proof':
      return baseScene(
        <>
          <rect x="212" y="196" width="216" height="34" rx="8" className="scene-card scene-main" />
          <rect x="270" y="156" width="100" height="34" rx="7" className="scene-screen" />
          <rect x="290" y="232" width="60" height="20" rx="10" className="scene-card scene-soft" />
          <rect x="450" y="126" width="64" height="78" rx="8" className="scene-accent" />
        </>,
        'scene-figure-sit',
        <g className="scene-thought">
          <circle cx="496" cy="163" r="3" />
          <circle cx="503" cy="154" r="4.5" />
          <circle cx="513" cy="146" r="6" />
        </g>,
      );
    case 'action':
      return baseScene(
        <>
          <rect x="214" y="136" width="212" height="108" rx="10" className="scene-map" />
          <circle cx="270" cy="176" r="10" className="scene-node scene-node-a" />
          <circle cx="334" cy="210" r="10" className="scene-node scene-node-b" />
          <circle cx="392" cy="168" r="10" className="scene-node scene-node-c" />
          <path d="M270 176 334 210 392 168" className="scene-link" />
        </>,
        'scene-figure-present',
        <>
          <path d="M460 206c16-6 30-14 38-24" className="scene-present-line" />
        </>,
      );
    default:
      return null;
  }
};

// eslint-disable-next-line react-refresh/only-export-components -- exports icon component + room renderer helper
export { RoomIcon, renderRoomIllustration };
