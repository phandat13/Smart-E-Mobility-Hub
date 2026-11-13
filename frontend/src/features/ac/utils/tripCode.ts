/** Mã hiển thị của chuyến đi theo Figma: "UG" + ngày/tháng/năm (ddMMyy) + "-" + số hiệu xe, ví dụ UG071026-018. */
export function tripCode(trip: { startedAt: string; vehicleCode: string }): string {
  const d = new Date(trip.startedAt);
  const p = (n: number) => String(n).padStart(2, '0');
  const vehicle = trip.vehicleCode.replace(/\D/g, '').padStart(3, '0');
  return `UG${p(d.getDate())}${p(d.getMonth() + 1)}${p(d.getFullYear() % 100)}-${vehicle}`;
}
