import type { SVGProps } from 'react';

export function ConnectEdLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      className="h-8 w-auto"
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="Playfair Display, serif"
        fontSize="30"
        fontWeight="bold"
        fill="url(#logoGradient)"
      >
        EduConnect
      </text>
    </svg>
  );
}

// You can add other custom SVG icons here if needed
// For example:
// export function CustomCalendarIcon(props: SVGProps<SVGSVGElement>) { ... }
