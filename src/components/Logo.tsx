import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="JSX Viewer Logo - Symbolizing UI structure and UX journey"
    >
      <title>JSX Viewer Logo</title>
      <desc>A minimalist logo featuring a structured frame for UI and a fluid curve for UX journey.</desc>
      {/* UI: The Structured Frame */}
      <rect
        x="20"
        y="20"
        width="60"
        height="60"
        rx="14"
        className="stroke-gray-900 dark:stroke-gray-100"
        strokeWidth="6"
      />
      {/* UX: The Fluid User Journey */}
      <path
        d="M35 50C35 25 65 75 65 50"
        className="stroke-gray-400 dark:stroke-gray-500"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* The Interaction Point (The "Click") */}
      <circle
        cx="65"
        cy="50"
        r="4"
        className="fill-gray-900 dark:fill-gray-100"
      />
    </svg>
  );
}
