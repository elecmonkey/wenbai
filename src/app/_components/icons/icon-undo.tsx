'use client';

import type { SVGProps } from 'react';

export function IconUndo(props: SVGProps<SVGSVGElement>) {
  const { className = 'h-4 w-4', ...rest } = props;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* Icon from Solar by 480 Design - https://creativecommons.org/licenses/by/4.0/ */}
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M4 7h11a5 5 0 0 1 0 10H8M4 7l3-3M4 7l3 3"
      />
    </svg>
  );
}
