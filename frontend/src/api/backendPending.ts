/**
 * PV / MT chưa có hợp đồng API thống nhất với backend (xem README).
 * Khi tắt mock, các thao tác trả lỗi rõ ràng thay vì gửi request tới endpoint phỏng đoán.
 */
export function backendPending(feature: string): Promise<never> {
  return Promise.reject(new Error(`${feature}: API backend chưa được kết nối.`));
}
