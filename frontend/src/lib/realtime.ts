import { Client, type IMessage } from '@stomp/stompjs';
import { tokenStore } from '../api/client';

/**
 * STOMP qua /ws: /topic/hubs/{id} (số liệu Hub), /topic/alerts (Dashboard), /user/queue/notifications.
 * Góp ý #1: giao diện cập nhật ngay khi có thay đổi; vẫn có làm mới định kỳ làm phương án dự phòng.
 */
let client: Client | null = null;
const subs = new Map<string, Set<(body: unknown) => void>>();

function ensure() {
  if (client) return client;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  client = new Client({
    brokerURL: `${proto}://${location.host}/ws`,
    connectHeaders: { Authorization: 'Bearer ' + (tokenStore.get() ?? '') },
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      subs.forEach((_, dest) => subscribeRaw(dest));
    },
  });
  client.activate();
  return client;
}

const active = new Map<string, { unsubscribe: () => void }>();
function subscribeRaw(dest: string) {
  if (!client?.connected || active.has(dest)) return;
  active.set(dest, client.subscribe(dest, (m: IMessage) => {
    let body: unknown = m.body;
    try { body = JSON.parse(m.body); } catch { /* text */ }
    subs.get(dest)?.forEach((fn) => fn(body));
  }));
}

export function subscribe(dest: string, fn: (body: unknown) => void): () => void {
  if (!tokenStore.get()) return () => {};
  ensure();
  if (!subs.has(dest)) subs.set(dest, new Set());
  subs.get(dest)!.add(fn);
  subscribeRaw(dest);
  return () => {
    const s = subs.get(dest);
    s?.delete(fn);
    if (s && s.size === 0) {
      subs.delete(dest);
      active.get(dest)?.unsubscribe();
      active.delete(dest);
    }
  };
}

export function resetRealtime() {
  client?.deactivate();
  client = null;
  active.clear();
}
