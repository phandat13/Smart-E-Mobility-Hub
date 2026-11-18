import type { Hub } from '../types'

export function HubDirections({ hub, title = 'Đường đến Hub' }: { hub: Hub | undefined; title?: string }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      <div className="re-map" aria-hidden="true">
        <span>{hub?.name ?? '…'}</span>
      </div>
      {hub && (
        <a
          className="re-map-link"
          href={`https://www.google.com/maps/dir/?api=1&destination=${hub.latitude},${hub.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          Mở chỉ đường
        </a>
      )}
    </section>
  )
}
