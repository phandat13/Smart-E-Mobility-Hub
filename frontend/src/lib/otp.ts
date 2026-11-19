/**
 * OTP trả xe offline – cùng thuật toán với backend OfflineOtp:
 * HMAC-SHA256(key = UTF-8(secretHex), msg = counter 8 byte big-endian), counter = floor(epoch/300), cắt động → 6 chữ số.
 * Tính hoàn toàn trên thiết bị nên dùng được khi mất mạng.
 */
export async function offlineOtp(secretHex: string, at: Date = new Date()): Promise<string> {
  const counter = Math.floor(at.getTime() / 1000 / 300);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secretHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const off = h[h.length - 1] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}
