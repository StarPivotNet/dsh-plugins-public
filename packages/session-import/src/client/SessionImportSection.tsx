/** Settings section: scan and import foreign sessions, skills, memory, and automations. */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionImportKey } from './locales.ts'
import css from './SessionImportSection.module.css'

export interface SessionImportRow {
  readonly source: 'claude' | 'codex' | 'cursor' | 'grok'
  readonly nativeId: string
  readonly path: string
  readonly title: string
  readonly cwd?: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly bytes: number
}

export interface SessionImportSkill {
  readonly source: 'claude' | 'codex' | 'cursor' | 'grok'
  readonly name: string
  readonly description: string
  readonly path: string
}

export interface SessionImportMemory {
  readonly source: 'claude' | 'codex'
  readonly kind: 'agents' | 'memory'
  readonly name: string
  readonly path: string
  readonly bytes: number
  readonly preview: string
}

export interface SessionImportAutomation {
  readonly source: 'codex'
  readonly nativeId: string
  readonly name: string
  readonly path: string
  readonly status: string
  readonly cwd?: string
  readonly rrule?: string
  readonly prompt: string
  readonly schedule: { kind: 'local-clock' | 'every' | 'unsupported'; time?: string; everySeconds?: number; reason?: string }
}

export interface SessionImportSectionInjected {
  listSessions: (source?: SessionImportRow['source'], query?: string) => Promise<{ entries: readonly SessionImportRow[]; total?: number }>
  importSessions: (paths: readonly string[]) => Promise<{ imported: number; skipped: number; failed: readonly { path: string; message: string }[] }>
  importOneSession: (path: string) => Promise<{ imported: number; skipped: number; failed: readonly { path: string; message: string }[] }>
  listSkills: () => Promise<{ entries: readonly SessionImportSkill[] }>
  importSkills: (paths: readonly string[]) => Promise<{ copied: number; overwritten: number; failed: readonly { path: string; message: string }[] }>
  listMemories: () => Promise<{ entries: readonly SessionImportMemory[] }>
  importMemories: (paths: readonly string[]) => Promise<{ copied: number; merged: number; failed: readonly { path: string; message: string }[] }>
  listAutomations: () => Promise<{ entries: readonly SessionImportAutomation[] }>
  importAutomations: (paths: readonly string[]) => Promise<{ imported: number; skipped: number; unsupported: number; failed: readonly { path: string; message: string }[] }>
}

const SESSION_SOURCES: readonly SessionImportRow['source'][] = ['claude', 'codex', 'cursor', 'grok']
type ImportTab = 'sessions' | 'skills' | 'memory' | 'automations'

export type SessionImportSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.sessionImport'>
  & InjectFace<SessionImportSectionInjected>

export function SessionImportSection(props: SessionImportSectionProps): ReactNode {
  const { t, listSessions, importSessions, importOneSession, listSkills, importSkills, listMemories, importMemories, listAutomations, importAutomations } = props
  const [tab, setTab] = useState<ImportTab>('sessions')
  const [source, setSource] = useState<'all' | SessionImportRow['source']>('all')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<readonly SessionImportRow[]>([])
  const [total, setTotal] = useState(0)
  const [skills, setSkills] = useState<readonly SessionImportSkill[]>([])
  const [memories, setMemories] = useState<readonly SessionImportMemory[]>([])
  const [automations, setAutomations] = useState<readonly SessionImportAutomation[]>([])
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | undefined>(undefined)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')

  const load = async (nextQuery = query): Promise<void> => {
    setStatus('loading')
    setFailure('')
    try {
      if (tab === 'sessions') {
        const sources = source === 'all' ? SESSION_SOURCES : [source]
        const collected: SessionImportRow[] = []
        let discovered = 0
        setRows([])
        setTotal(0)
        for (const nextSource of sources) {
          const snapshot = await listSessions(nextSource, nextQuery.trim() || undefined)
          collected.push(...snapshot.entries)
          discovered += snapshot.total ?? snapshot.entries.length
          collected.sort((left, right) => right.updatedAt - left.updatedAt || left.path.localeCompare(right.path))
          setRows([...collected])
          setTotal(discovered)
        }
      } else if (tab === 'skills') {
        const snapshot = await listSkills()
        setSkills(snapshot.entries)
        setTotal(snapshot.entries.length)
      } else if (tab === 'memory') {
        const snapshot = await listMemories()
        setMemories(snapshot.entries)
        setTotal(snapshot.entries.length)
      } else {
        const snapshot = await listAutomations()
        setAutomations(snapshot.entries)
        setTotal(snapshot.entries.length)
      }
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    void load()
  }, [tab, source])

  const visibleRows = useMemo(() => filterByQuery(rows, query, row => [row.title, row.path, row.nativeId]), [rows, query])
  const visibleSkills = useMemo(() => {
    const filtered = source === 'all' ? skills : skills.filter(skill => skill.source === source)
    return filterByQuery(filtered, query, skill => [skill.name, skill.description, skill.path])
  }, [skills, source, query])
  const visibleMemories = useMemo(() => filterByQuery(memories, query, row => [row.name, row.preview, row.path]), [memories, query])
  const visibleAutomations = useMemo(() => filterByQuery(automations, query, row => [row.name, row.nativeId, row.path, row.prompt]), [automations, query])

  const toggle = (path: string): void => {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const runImport = async (paths: readonly string[]): Promise<void> => {
    setBusy(true)
    setMessage('')
    setFailure('')
    setProgress(undefined)
    try {
      if (tab === 'sessions') {
        const result = await importSessionPaths(importOneSession, paths, (done, total, current) => {
          setProgress({ done, total, current })
          setMessage(t('importProgress').replace('{done}', String(done)).replace('{total}', String(total)))
        })
        setMessage(`${t('imported')} ${String(result.imported)} / ${String(result.skipped)}`)
        setImportFailure(t, result.failed, setFailure)
      } else if (tab === 'skills') {
        const result = await importSkills(paths)
        setMessage(`${t('importedSkills')} ${String(result.copied)}`)
        setImportFailure(t, result.failed, setFailure)
      } else if (tab === 'memory') {
        const result = await importMemories(paths)
        setMessage(`${t('importedMemory')} ${String(result.copied)} / ${String(result.merged)}`)
        setImportFailure(t, result.failed, setFailure)
      } else {
        const result = await importAutomations(paths)
        setMessage(`${t('importedAutomations')} ${String(result.imported)} / ${String(result.skipped)} / ${String(result.unsupported)}`)
        setImportFailure(t, result.failed, setFailure)
      }
    } catch {
      setFailure(t('error'))
    } finally {
      setBusy(false)
      setProgress(undefined)
    }
  }

  const currentPaths = tab === 'sessions'
    ? visibleRows.map(row => row.path)
    : tab === 'skills'
      ? visibleSkills.map(skill => skill.path)
      : tab === 'memory'
        ? visibleMemories.map(row => row.path)
        : visibleAutomations.map(row => row.path)
  const selectedPaths = currentPaths.filter(path => selected.has(path))

  return (
    <div className={css.section}>
      <h2 className={css.heading}>{t('title')}</h2>
      <p className={css.intro}>{t('intro')}</p>
      <div className={css.tabs} role="tablist">
        {(['sessions', 'skills', 'memory', 'automations'] as const).map(next => (
          <button key={next} type="button" className={css.tab} data-active={tab === next} onClick={() => { setTab(next); setSelected(new Set()) }}>
            {t(`${next}Tab` as SessionImportKey)}
          </button>
        ))}
      </div>
      <div className={css.toolbar}>
        {tab === 'sessions' || tab === 'skills' ? (
          <label>
            <span className={css.hint}>{t('sourceFilter')}</span>
            <select className={css.select} value={source} onChange={event => { setSource(event.target.value as typeof source) }}>
              <option value="all">{t('sourceAll')}</option>
              <option value="claude">{t('sourceClaude')}</option>
              <option value="codex">{t('sourceCodex')}</option>
              <option value="cursor">{t('sourceCursor')}</option>
              <option value="grok">{t('sourceGrok')}</option>
            </select>
          </label>
        ) : null}
        <input
          className={css.search}
          value={query}
          onChange={event => { setQuery(event.target.value) }}
          onKeyDown={event => { if (event.key === 'Enter') void load() }}
          placeholder={t('search')}
        />
        <button type="button" className={css.button} disabled={status === 'loading'} onClick={() => { void load() }}>
          {status === 'loading' ? t('refreshing') : t('refresh')}
        </button>
        <button type="button" className={css.button} disabled={busy || selectedPaths.length === 0} onClick={() => { void runImport(selectedPaths) }}>
          {busy && tab === 'sessions' && progress !== undefined
            ? `${t('importing')} ${String(progress.done)}/${String(progress.total)}`
            : busy ? t('importing') : t('importSelected')}
        </button>
        <button type="button" className={css.button} data-primary="true" disabled={busy || currentPaths.length === 0} onClick={() => { void runImport(currentPaths) }}>
          {t('importAll')}
        </button>
      </div>
      {message.length > 0 ? <p className={css.status}>{message}</p> : null}
      {progress !== undefined ? (
        <div className={css.progress} role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <div className={css.progressBar} style={{ width: `${progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)}%` }} />
        </div>
      ) : null}
      {progress?.current !== undefined && progress.current.length > 0 ? <p className={css.hint}>{progress.current}</p> : null}
      {failure.length > 0 ? <p className={css.failure} role="alert">{failure}</p> : null}
      {renderBody({
        t, tab, status, visibleRows, visibleSkills, visibleMemories, visibleAutomations, selected, toggle,
      })}
      {status === 'idle' && tab === 'sessions' && total > visibleRows.length ? (
        <p className={css.hint}>{t('truncated').replace('{shown}', String(visibleRows.length)).replace('{total}', String(total))}</p>
      ) : null}
      <p className={css.hint}>{t('commandHint')}</p>
    </div>
  )
}

function renderBody(options: {
  t: SessionImportSectionProps['t']
  tab: ImportTab
  status: 'idle' | 'loading' | 'error'
  visibleRows: readonly SessionImportRow[]
  visibleSkills: readonly SessionImportSkill[]
  visibleMemories: readonly SessionImportMemory[]
  visibleAutomations: readonly SessionImportAutomation[]
  selected: ReadonlySet<string>
  toggle: (path: string) => void
}): ReactNode {
  const { t, tab, status, visibleRows, visibleSkills, visibleMemories, visibleAutomations, selected, toggle } = options
  if (status === 'error') return <p className={css.failure} role="alert">{t('error')}</p>
  if (tab === 'sessions') {
    if (visibleRows.length === 0) return <p className={css.empty}>{status === 'loading' ? t('refreshing') : t('empty')}</p>
    return (
      <div className={css.list}>
        {visibleRows.map(row => (
          <label key={row.path} className={css.row}>
            <input type="checkbox" checked={selected.has(row.path)} onChange={() => { toggle(row.path) }} />
            <span>
              <p className={css.title}>{row.title}</p>
              <p className={css.meta}><span className={css.tag}>{row.source}</span> {t('nativeId')}: {row.nativeId}</p>
              {row.cwd === undefined ? null : <p className={css.meta}>{t('cwd')}: {row.cwd}</p>}
              <p className={css.meta}>{row.path}</p>
            </span>
            <span className={css.meta}>{formatBytes(row.bytes)}</span>
          </label>
        ))}
      </div>
    )
  }
  if (tab === 'skills') {
    if (visibleSkills.length === 0) return <p className={css.empty}>{status === 'loading' ? t('refreshing') : t('skillsEmpty')}</p>
    return (
      <div className={css.list}>
        {visibleSkills.map(skill => (
          <label key={skill.path} className={css.row}>
            <input type="checkbox" checked={selected.has(skill.path)} onChange={() => { toggle(skill.path) }} />
            <span>
              <p className={css.title}>{skill.name}</p>
              <p className={css.meta}><span className={css.tag}>{skill.source}</span> {skill.description}</p>
              <p className={css.meta}>{skill.path}</p>
            </span>
          </label>
        ))}
      </div>
    )
  }
  if (tab === 'memory') {
    if (visibleMemories.length === 0) return <p className={css.empty}>{status === 'loading' ? t('refreshing') : t('memoryEmpty')}</p>
    return (
      <div className={css.list}>
        {visibleMemories.map(row => (
          <label key={row.path} className={css.row}>
            <input type="checkbox" checked={selected.has(row.path)} onChange={() => { toggle(row.path) }} />
            <span>
              <p className={css.title}>{row.name}</p>
              <p className={css.meta}><span className={css.tag}>{row.source}</span> {row.kind}</p>
              <p className={css.meta}>{row.preview}</p>
              <p className={css.meta}>{row.path}</p>
            </span>
            <span className={css.meta}>{formatBytes(row.bytes)}</span>
          </label>
        ))}
      </div>
    )
  }
  if (visibleAutomations.length === 0) return <p className={css.empty}>{status === 'loading' ? t('refreshing') : t('automationsEmpty')}</p>
  return (
    <div className={css.list}>
      {visibleAutomations.map(row => (
        <label key={row.path} className={css.row}>
          <input type="checkbox" checked={selected.has(row.path)} onChange={() => { toggle(row.path) }} />
          <span>
            <p className={css.title}>{row.name}</p>
            <p className={css.meta}><span className={css.tag}>{row.status}</span> {scheduleLabel(row)}</p>
            {row.cwd === undefined ? null : <p className={css.meta}>{t('cwd')}: {row.cwd}</p>}
            <p className={css.meta}>{row.path}</p>
          </span>
        </label>
      ))}
    </div>
  )
}

function scheduleLabel(row: SessionImportAutomation): string {
  if (row.schedule.kind === 'every') return `every ${String(row.schedule.everySeconds)}s`
  if (row.schedule.kind === 'local-clock') return row.schedule.time ?? row.rrule ?? 'local-clock'
  return row.schedule.reason ?? row.rrule ?? 'unsupported'
}

function filterByQuery<T>(items: readonly T[], query: string, values: (item: T) => readonly string[]): readonly T[] {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return items
  return items.filter(item => values(item).some(value => value.toLowerCase().includes(needle)))
}

async function importSessionPaths(
  importOneSession: SessionImportSectionInjected['importOneSession'],
  paths: readonly string[],
  onProgress: (done: number, total: number, current: string) => void,
): Promise<{ imported: number; skipped: number; failed: { path: string; message: string }[] }> {
  let imported = 0
  let skipped = 0
  const failed: { path: string; message: string }[] = []
  const total = paths.length
  for (const [index, path] of paths.entries()) {
    onProgress(index, total, path)
    try {
      const result = await withTimeout(importOneSession(path), 60_000, path)
      imported += result.imported
      skipped += result.skipped
      failed.push(...result.failed)
    } catch (error) {
      failed.push({ path, message: error instanceof Error ? error.message : String(error) })
    }
  }
  onProgress(total, total, '')
  return { imported, skipped, failed }
}

async function withTimeout<T>(work: Promise<T>, ms: number, path: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => { reject(new Error(`${path} timed out after ${String(ms)}ms`)) }, ms)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

function setImportFailure(
  t: SessionImportSectionProps['t'],
  failed: readonly { message: string }[],
  setFailure: (value: string) => void,
): void {
  if (failed.length === 0) return
  setFailure(`${t('failed')} ${String(failed.length)}：${failed.slice(0, 3).map(item => item.message).join('；')}`)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
