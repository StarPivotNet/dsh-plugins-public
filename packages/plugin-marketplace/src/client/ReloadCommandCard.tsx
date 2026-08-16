import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { DisclosureRow, IconApiOutline14, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { reloadCardCopy, sameReloadProgress, type ReloadCardNode } from './reload-card.ts'
import type { ReloadProgress } from './ReloadProgressToast.tsx'
import css from './ReloadCommandCard.module.css'

export { reloadCardCopy } from './reload-card.ts'

export interface ReloadProgressSource {
  get(): ReloadProgress | undefined
  names?(): readonly string[]
  rebootSettled?(): boolean
  subscribe(listener: () => void): () => void
}

export interface ReloadCommandCardProps {
  readonly node: ReloadCardNode
  readonly progress?: ReloadProgress
  readonly names?: readonly string[]
  readonly rebootSettled?: boolean
  readonly progressSource?: ReloadProgressSource
}

function leadingFor(state: 'running' | 'ok' | 'error'): ReactNode {
  return state === 'error' ? <StateDot state="error" /> : <IconApiOutline14 size={14} />
}

function useReloadSnapshot(
  progress: ReloadProgress | undefined,
  names: readonly string[] | undefined,
  rebootSettled: boolean | undefined,
  source: ReloadProgressSource | undefined,
): { progress: ReloadProgress | undefined; names: readonly string[]; rebootSettled: boolean } {
  let cached = {
    progress: source?.get() ?? progress,
    names: source?.names?.() ?? names ?? [],
    rebootSettled: source?.rebootSettled?.() ?? rebootSettled === true,
  }
  return useSyncExternalStore(
    listener => source?.subscribe(listener) ?? (() => {}),
    () => {
      const next = {
        progress: source?.get() ?? progress,
        names: source?.names?.() ?? names ?? [],
        rebootSettled: source?.rebootSettled?.() ?? rebootSettled === true,
      }
      if (
        sameReloadProgress(cached.progress, next.progress)
        && cached.names.join('\0') === next.names.join('\0')
        && cached.rebootSettled === next.rebootSettled
      ) return cached
      cached = next
      return next
    },
    () => ({ progress, names: names ?? [], rebootSettled: rebootSettled === true }),
  )
}

export function ReloadCommandCard({
  node, progress, names, rebootSettled, progressSource,
}: ReloadCommandCardProps): ReactNode {
  const [expanded, setExpanded] = useState(false)
  const live = useReloadSnapshot(progress, names, rebootSettled, progressSource)
  const { summary, body, state } = reloadCardCopy(node, live.progress, live.names, {
    rebootSettled: live.rebootSettled,
  })
  const open = expanded && body !== null
  return (
    <div className={css.root} data-variant="others" data-state={state}>
      <DisclosureRow
        rowClassName={css.row}
        leadingClassName={css.leading}
        titleClassName={css.title}
        chevronClassName={css.chevron}
        icon={leadingFor(state)}
        title={node.name ?? 'reload'}
        open={open}
        expandable={body !== null}
        expandOnRowClick
        keepContentWhenOpen
        onToggle={() => { setExpanded(value => !value) }}
        collapsedContent={(
          <>
            <span className={css.separator} aria-hidden />
            <span className={css.summary} data-error={state === 'error' || undefined}>{summary}</span>
          </>
        )}
      >
        <pre className={css.body} data-error={state === 'error' || undefined}>{body}</pre>
      </DisclosureRow>
    </div>
  )
}
