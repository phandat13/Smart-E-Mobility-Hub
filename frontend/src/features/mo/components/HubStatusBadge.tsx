export default function HubStatusBadge({ value }: { value: string }) {
  const tone = ['Hoạt động', 'Sẵn sàng', 'Khả dụng'].includes(value)
    ? 'success'
    : ['Đang sạc', 'Đã đặt'].includes(value)
      ? 'info'
      : ['Báo lỗi', 'Ngưng hoạt động', 'Cần kiểm tra'].includes(value)
        ? 'danger'
        : 'warning';
  return <span className={'hub-operations__status hub-operations__status--' + tone}>{value}</span>;
}
