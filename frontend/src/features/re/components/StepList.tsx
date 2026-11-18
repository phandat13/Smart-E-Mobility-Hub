import type { ReactNode } from 'react'

export type StepState = 'idle' | 'running' | 'done' | 'failed' | 'skipped'

export interface Step {
  key: string
  title: ReactNode
  detail?: ReactNode
  state: StepState
}

const icon: Record<StepState, string> = {
  idle: '',
  running: '',
  done: '✓',
  failed: '✕',
  skipped: '–',
}

export function StepList({ steps, numbered = false }: { steps: Step[]; numbered?: boolean }) {
  return (
    <ol className={`re-steps${numbered ? ' is-numbered' : ''}`}>
      {steps.map((s, i) => (
        <li key={s.key} className={`re-step is-${s.state}`}>
          <span className="re-step-dot" aria-hidden="true">
            {s.state === 'running' ? <span className="re-spinner" /> : icon[s.state] || (numbered ? i + 1 : '')}
          </span>
          <div>
            <div className="re-step-title">{s.title}</div>
            {s.detail && <div className="re-step-detail">{s.detail}</div>}
          </div>
          <span className="sr-only">{stateText[s.state]}</span>
        </li>
      ))}
    </ol>
  )
}

const stateText: Record<StepState, string> = {
  idle: 'chưa kiểm tra',
  running: 'đang kiểm tra',
  done: 'đạt',
  failed: 'không đạt',
  skipped: 'bỏ qua',
}
