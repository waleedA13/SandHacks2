import Link from "next/link";

export function Header() {
  return (
    <header className="bar">
      <Link className="logo" href="/">
        {/* Sunrise: a half-sun above a horizon bar. */}
        <svg width="32" height="32" viewBox="0 0 36 36" aria-hidden="true">
          <path d="M5 22a13 13 0 0 1 26 0z" fill="#F2B441" />
          <rect x="4" y="23" width="28" height="3" rx="1.5" fill="#1E5A57" />
        </svg>
        TheraCheck
      </Link>
    </header>
  );
}
