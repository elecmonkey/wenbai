'use client';

import type { SVGProps } from 'react';

export function IconImport(props: SVGProps<SVGSVGElement>) {
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
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
        <path d="M4 12a8 8 0 1 0 16 0" />
        <path strokeLinejoin="round" d="M12 4v10m0 0l3-3m-3 3l-3-3" />
      </g>
    </svg>
  );
}
