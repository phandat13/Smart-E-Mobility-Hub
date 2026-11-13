interface RefreshIconProps {
  size?: number;
  className?: string;
}

/** Biểu tượng làm mới (mũi tên vòng). */
export default function RefreshIcon({ size = 14, className }: RefreshIconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
