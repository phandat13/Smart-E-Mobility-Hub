import type { ReactNode } from 'react';
export default function SimulationTag({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={'what-if-simulation__tag what-if-simulation__tag--' + tone}>{children}</span>
  );
}
