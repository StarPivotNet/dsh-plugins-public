/** Settings section: scan and import foreign sessions and skills. */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionImportKey } from './locales.ts'
import css from './SessionImportSection.module.css'

export interface SessionImportRow {
  readonly source: 'claude' | 'codex' | 'cursor'
  readonly nativeId: string
  readonly path: string
  readonly title: string
  readonly cwd?: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly bytes: number
}

export interface SessionImportSkill {
  readonly source: 'claude' | 'codex' | 'cursor'
  readonly name: string
  readonly description: string
  readonly path: string
}

export interface SessionImportSectionInjected {
  listSessions: (source?: SessionImportRow['source']) => Promise<{ entries: readonly SessionImportRow[] }>
  importSessions: (paths: readonly string[]) => Promise<{ imported: number; skipped: number; failed: readonly { path: string; message: string }[] }>
  listSkills: () => Promise<{ entries: readonly SessionImportSkill[] }>
  importSkills: (paths: readonly string[]) => Promise<{ copied: number; overwritten: number; failed: readonly { path: string; message: string }[] }>
}

export type SessionImportSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.sessionImport'>
  & InjectFace<SessionImportSectionInjected>

export function SessionImportSection(props: SessionImportSectionProps): ReactNode {
  const { t, listSessions, importSessions, listSkills, importSkills } = props
  const [tab, setTab] = useState<'sessions' | 'skills'>('sessions')
  const [source, setSource] = useState<'all' | SessionImportRow['source']>('all')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<readonly SessionImportRow[]>([])
  const [skills, setSkills] = useState<readonly SessionImportSkill[]>([])
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')

  const load = async (): Promise<void> => {
    setStatus('loading')
    setFailure('')
    try {
      if (tab === 'sessions') {
        const snapshot = await listSessions(source === 'all' ? undefined : source)
        setRows(snapshot.entries)
      } else {
        const snapshot = await listSkills()
        setSkills(snapshot.entries)
      }
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    void load()
  }, [tab, source])

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length === 0) return rows
    return rows.filter(row => (
      row.title.toLowerCase().includes(needle)
      || row.path.toLowerCase().includes(needle)
      || row.nativeId.toLowerCase().includes(needle)
    ))
  }, [rows, query])

  const visibleSkills = useMemo(() => {
    const filtered = source === 'all' ? skills : skills.filter(skill => skill.source === source)
    const needle = query.trim().toLowerCase()
    if (needle.length === 0) return filtered
    return filtered.filter(skill => (
      skill.name.toLowerCase().includes(needle)
      || skill.description.toLowerCase().includes(needle)
      || skill.path.toLowerCase().includes(needle)
    ))
  }, [skills, source, query])

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
    try {
      if (tab === 'sessions') {
        const result = await importSessions(paths)
        setMessage(`${t('imported')} ${String(result.imported)} / ${String(result.skipped)}`)
        if (result.failed.length > 0) setFailure(`${t('failed')} ${String(result.failed.length)}`)
      } else {
        const result = await importSkills(paths)
        setMessage(`${t('importedSkills')} ${String(result.copied)}`)
        if (result.failed.length > 0) setFailure(`${t('failed')} ${String(result.failed.length)}`)
      }
    } catch {
      setFailure(t('error'))
    } finally {
      setBusy(false)
    }
  }

  const currentPaths = tab === 'sessions' ? visibleRows.map(row => row.path) : visibleSkills.map(skill => skill.path)
  const selectedPaths = currentPaths.filter(path => selected.has(path))

  return (
    <div className={css.section}>
      <h2 className={css.heading}>{t('title')}</h2>
      <p className={css.intro}>{t('intro')}</p>
      <div className={css.tabs} role="tablist">
        <button type="button" className={css.tab} data-active={tab === 'sessions'} onClick={() => { setTab('sessions'); setSelected(new Set()) }}>
          {t('sessionsTab')}
        </button>
        <button type="button" className={css.tab} data-active={tab === 'skills'} onClick={() => { setTab('skills'); setSelected(new Set()) }}>
          {t('skillsTab')}
        </button>
      </div>
      <div className={css.toolbar}>
        <label>
          <span className={css.hint}>{t('sourceFilter')}</span>
          <select className={css.select} value={source} onChange={event => { setSource(event.target.value as typeof source) }}>
            <option value="all">{t('sourceAll')}</option>
            <option value="claude">{t('sourceClaude')}</option>
            <option value="codex">{t('sourceCodex')}</option>
            <option value="cursor">{t('sourceCursor')}</option>
          </select>
        </label>
        <input className={css.search} value={query} onChange={event => { setQuery(event.target.value) }} placeholder={t('search')} />
        <button type="button" className={css.button} disabled={status === 'loading'} onClick={() => { void load() }}>
          {status === 'loading' ? t('refreshing') : t('refresh')}
        </button>
        <button type="button" className={css.button} disabled={busy || selectedPaths.length === 0} onClick={() => { void runImport(selectedPaths) }}>
          {busy ? t('importing') : t('importSelected')}
        </button>
        <button type="button" className={css.button} data-primary="true" disabled={busy || currentPaths.length === 0} onClick={() => { void runImport(currentPaths) }}>
          {t('importAll')}
        </button>
      </div>
      {message.length > 0 ? <p className={css.status}>{message}</p> : null}
      {failure.length > 0 ? <p className={css.failure} role="alert">{failure}</p> : null}
      {status === 'error' ? (
        <p className={css.failure} role="alert">{t('error')}</p>
      ) : tab === 'sessions' ? (
        visibleRows.length === 0 ? <p className={css.empty}>{t('empty')}</p> : (
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
      ) : (
        visibleSkills.length === 0 ? <p className={css.empty}>{t('skillsEmpty')}</p> : (
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
      )}
      <p className={css.hint}>{t('commandHint')}</p>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

