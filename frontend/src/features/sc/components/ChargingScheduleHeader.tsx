import type * as React from 'react';
export default function ChargingScheduleHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="charging-schedule__heading">
      <div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {children && <div className="charging-schedule__heading-actions">{children}</div>}
    </div>
  );
}
