import type * as React from 'react';
import { icons } from '../../../assets/icons';
export default function HubOperationModal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="hub-operations__modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section className="hub-operations__modal" role="dialog" aria-modal="true">
        <div className="hub-operations__modal-head">
          <h2>{title}</h2>
          <button className="hub-operations__icon-btn" onClick={close}>
            {icons.close}
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
