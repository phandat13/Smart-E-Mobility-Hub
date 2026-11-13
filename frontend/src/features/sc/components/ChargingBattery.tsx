import type { CSSProperties } from 'react';
export default function ChargingBattery({ value }: { value: number }) {
  return (
    <div className="charging-schedule__battery">
      <span>
        <i
          className={
            value < 20
              ? 'charging-schedule__battery-fill charging-schedule__battery-fill--low'
              : value < 35
                ? 'charging-schedule__battery-fill charging-schedule__battery-fill--mid'
                : 'charging-schedule__battery-fill'
          }
          style={{ '--charging-battery-width': value + '%' } as CSSProperties}
        />
      </span>
      <b
        className={
          value < 20
            ? 'charging-schedule__battery-value--low'
            : value < 35
              ? 'charging-schedule__battery-value--mid'
              : ''
        }
      >
        {value}%
      </b>
    </div>
  );
}
