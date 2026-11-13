import type * as React from 'react';
export default function ChargingSchedulePill({
  children,
  tone = 'blue',
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={'charging-schedule__pill charging-schedule__pill--' + tone}>{children}</span>
  );
}
