import type * as React from 'react';
export default function HubFormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="hub-operations__field">
      <span>{label}</span>
      {children}
    </label>
  );
}
