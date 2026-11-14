import Link from "next/link";

/**
 * Logo oficial GMN Profile: pino de localização (azul-marinho) com círculo e
 * check turquesa, ao lado do wordmark "GMN Profile".
 * Cores pela marca: --navy e --brand-bright.
 */

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} fill="none" aria-hidden="true">
      {/* pino */}
      <path
        d="M24 3C13.8 3 5.5 11.1 5.5 21.3c0 11.6 14.6 27.4 17.4 30.3a1.5 1.5 0 0 0 2.2 0C27.9 48.7 42.5 32.9 42.5 21.3 42.5 11.1 34.2 3 24 3Z"
        stroke="var(--navy)"
        strokeWidth="2.6"
      />
      {/* círculo interno */}
      <circle cx="24" cy="21.5" r="11" stroke="var(--navy)" strokeWidth="2.2" />
      {/* arco de realce (swoosh) */}
      <path
        d="M33.5 16.2A11 11 0 0 0 16 15.4"
        stroke="var(--navy)"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* check turquesa */}
      <path
        d="M18.2 22.2l3.8 4.1 8-8.6"
        stroke="var(--brand-bright)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-logo ${className}`}>
      <span className="font-semibold text-navy">GMN</span>{" "}
      <span className="font-light text-navy">Profile</span>
    </span>
  );
}

/** Logo completo (marca + wordmark). `href` envolve num link (default "/"). */
export default function BrandLogo({
  className = "",
  markClassName = "h-7 w-auto",
  textClassName = "text-lg",
  showText = true,
  href = "/",
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
  href?: string | null;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className={markClassName} />
      {showText && <BrandWordmark className={textClassName} />}
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="GMN Profile">
      {inner}
    </Link>
  );
}
