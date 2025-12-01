import type { JSX } from "react";

/**
 * Custom banana icon component for Monkey Doodle branding
 */
export function BananaIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2C10.5 2 9.5 3 9 4C8.5 3 7.5 2 6 2C4.5 2 3.5 3.5 4 5C3.5 6.5 4 8 5 9C4 10 3 11 3 12.5C3 14 4 15 5 15.5C6 16 7 15.5 8 14.5C9 15.5 10 16 11 15.5C12 15 13 14.5 13.5 13.5C14 14.5 15 15 16 14.5C17 14 18 13 18 11.5C18 10 17 9 16 8C17 7 17.5 5.5 17 4C17.5 2.5 16 2 14.5 2C13.5 2 12.5 2.5 12 3.5C11.5 2.5 10.5 2 9.5 2C8.5 2 7.5 2.5 7 3.5C6.5 2.5 5.5 2 4.5 2"
        fill="#FFD700"
        stroke="#FFA500"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3C11.5 3.5 10.5 4 9.5 4"
        stroke="#FFA500"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 4C6.5 4.5 5.5 5 4.5 5"
        stroke="#FFA500"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 4C17.5 4.5 18.5 5 19.5 5"
        stroke="#FFA500"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
