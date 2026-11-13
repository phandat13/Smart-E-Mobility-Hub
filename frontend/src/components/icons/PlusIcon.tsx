interface PlusIconProps {
  size?: number;
  className?: string;
}

/** Biểu tượng thêm (dấu +). */
export default function PlusIcon({ size = 22, className }: PlusIconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
