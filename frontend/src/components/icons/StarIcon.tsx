interface StarIconProps {
  /** true: sao đặc (đã chọn); false: chỉ viền. */
  filled?: boolean;
  size?: number;
  className?: string;
}

/** Biểu tượng ngôi sao dùng cho đánh giá chuyến đi. Màu lấy theo `currentColor`. */
export default function StarIcon({ filled = true, size = 16, className }: StarIconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.53L12 17.5l-5.87 3.07 1.12-6.53L2.5 9.41l6.56-.95L12 2.5z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
