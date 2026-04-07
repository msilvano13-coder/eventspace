interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Allura hand-lettered "S" on a lavender-to-blush gradient mark.
 */
export function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  // Scale font size proportionally to container
  const fontSize = size * 0.75;
  return (
    <div
      className={`flex items-center justify-center rounded-lg font-logo text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize,
        lineHeight: 1,
        background: "linear-gradient(135deg, #b8a9c9, #f2c4c4)",
      }}
    >
      <span style={{ marginTop: size * 0.08 }}>S</span>
    </div>
  );
}

interface LogoFullProps {
  size?: number;
  className?: string;
  textClassName?: string;
}

/**
 * Full logo: Allura S mark + "SoireeSpace" wordmark.
 */
export function LogoFull({
  size = 32,
  className = "",
  textClassName = "text-lg font-heading font-semibold tracking-tight",
}: LogoFullProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className={textClassName}>Soir&eacute;eSpace</span>
    </span>
  );
}
