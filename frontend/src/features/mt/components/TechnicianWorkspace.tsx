import { type ReactNode } from 'react';
import type { MaintenanceOrder } from '../types';
import OrderSidebar from './OrderSidebar';

export default function Workspace({
  order,
  selectedId,
  children,
}: {
  order: MaintenanceOrder;
  selectedId: string;
  children: ReactNode;
}) {
  return (
    <main className="mt-tech-workspace">
      <OrderSidebar order={order} selectedId={selectedId} />
      {children}
    </main>
  );
}
