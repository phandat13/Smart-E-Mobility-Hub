import type * as React from 'react';
export default function HubPageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="hub-page-header">
      <div>
        <h1 className="hub-page-header__title">{title}</h1>
        <p className="hub-page-header__subtitle">{sub}</p>
      </div>
      {action}
    </div>
  );
}
