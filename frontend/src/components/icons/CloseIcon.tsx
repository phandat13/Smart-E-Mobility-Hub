interface CloseIconProps {
  size?: number;
  className?: string;
}

/** Biểu tượng đóng (dấu ×). */
export default function CloseIcon({ size = 14, className }: CloseIconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
