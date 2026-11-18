import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  icon?: ReactNode
  tone?: 'default' | 'danger'
  onClose: () => void
  busy?: boolean
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ title, icon, tone = 'default', onClose, busy = false, children, footer }: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const latest = useRef({ onClose, busy })
  useEffect(() => {
    latest.current = { onClose, busy }
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !latest.current.busy) latest.current.onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <div className="re-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        ref={dialogRef}
        className="re-modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {icon && <div className={`re-modal-icon is-${tone}`}>{icon}</div>}
        <h2 id={titleId} className="re-modal-title">
          {title}
        </h2>
        <div className="re-modal-body">{children}</div>
        {footer && <div className="re-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
