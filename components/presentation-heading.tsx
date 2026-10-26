import type { ReactNode } from "react";

/** Shared title treatment for every presentation canvas. */
export function PresentationHeading({ title, punctuation, subtitle, level = "h2", label }: {
  title: string;
  punctuation: ":" | "?" | "!";
  subtitle?: ReactNode;
  level?: "h1" | "h2";
  label?: string;
}) {
  const Heading = level;
  return <header className="presentation-heading">
    <div className="presentation-google-marks" aria-hidden="true"><i /><i /><i /><i /></div>
    <Heading aria-label={label}>
      <span className="presentation-name">{title}<span>{punctuation}</span></span>
      {subtitle && <span className="presentation-subtitle">{subtitle}</span>}
    </Heading>
  </header>;
}
