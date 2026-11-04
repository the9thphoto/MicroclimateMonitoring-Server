interface IconProps {
  className?: string;
  size?: number;
}

function baseProps({ className, size = 20 }: IconProps) {
  return {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    role: "presentation",
    "aria-hidden": true,
    focusable: false,
  };
}

export function TemperatureIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0Z" />
      <path d="M12 8v7" />
    </svg>
  );
}

export function HumidityIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" />
      <path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5" />
    </svg>
  );
}

export function ComfortIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15 16 9" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function WindIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M3 8h10a2.5 2.5 0 1 0-2.4-3.2" />
      <path d="M3 12h14a2.5 2.5 0 1 1-2.4 3.2" />
      <path d="M3 16h6" />
    </svg>
  );
}

export function AirIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <circle cx="7" cy="8" r="2" />
      <circle cx="16" cy="7" r="1.6" />
      <circle cx="12" cy="15" r="2.4" />
      <path d="M3 19h4" />
      <path d="M17 18h4" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function LocateIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M8 5v14M16 5v14" strokeWidth="3" />
    </svg>
  );
}

export function AnalysisIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}

export function ForecastIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M4 17h11a3 3 0 0 0 .4-6 5 5 0 0 0-9.7-1.1A4 4 0 0 0 4 17Z" />
      <path d="M8 20.5 7 22M12 20.5 11 22M16 20.5 15 22" />
    </svg>
  );
}

export function FitIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
    </svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <title>图标</title>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </svg>
  );
}
