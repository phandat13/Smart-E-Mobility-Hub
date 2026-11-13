import { StarIcon } from '../../../components/icons';
import { STAR_LABELS } from '../constants';
import './StarRating.css';

interface StarRatingProps {
  label: string;
  value: number;
  /** Bỏ trống để hiển thị chế độ chỉ đọc. */
  onChange?: (stars: number) => void;
  disabled?: boolean;
}

/** Chọn 1–5 sao kèm nhãn "n/5 · mô tả". */
export default function StarRating({ label, value, onChange, disabled }: StarRatingProps) {
  return (
    <div className="star-rating" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sao`}
          className={`star-rating__star${value >= n ? ' is-on' : ''}`}
          disabled={disabled || !onChange}
          onClick={() => onChange?.(n)}
        >
          <StarIcon size={30} />
        </button>
      ))}
      <span className="star-rating__text">{value > 0 ? `${value}/5 · ${STAR_LABELS[value]}` : 'Chưa chọn'}</span>
    </div>
  );
}
