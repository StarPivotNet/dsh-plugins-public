/** Plugins marketplace section: discover + installed pages plus Host cards. */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  IconCloseOutline16,
  IconEditOutline16,
  IconSearchOutline16,
  IconTrashOutline16,
  Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import { catalogPackageLabel, installedHoverLabel } from './catalog-label.ts'
import { confirmInstallMessage } from './confirm-install.ts'
import type { MarketplaceLocaleKey } from './locales.ts'
import css from './MarketplaceSettingsSection.module.css'

/** Catalog listing projected for the discover page. */
export interface MarketplaceCatalogItem {
  readonly name: string
  readonly version: string
  readonly title: string
  readonly description: string
  readonly homepage: string
  readonly kind: 'bundle' | 'plugin'
  readonly sourceUrl: string
  readonly sourceTitle: string
}

export interface MarketplaceCatalogSource {
  readonly url: string
  readonly title: string
  readonly ok: boolean
  readonly error?: string
  readonly count: number
}

/** Installed row projected for the installed page. */
export interface MarketplaceInstalledItem {
  readonly packageName: string
  readonly spec: string
  readonly kind: 'bundle' | 'dependency' | 'inbox'
  readonly installed: boolean
  readonly entryIds: readonly string[]
  readonly enabled: boolean
  readonly fiberPhase: string | null
  readonly canUninstall: boolean
  readonly canToggle: boolean
}

/** Catalog snapshot the Host returns. */
export interface MarketplaceCatalogSnapshot {
  readonly configured: boolean
  readonly sources: readonly MarketplaceCatalogSource[]
  readonly entries: readonly MarketplaceCatalogItem[]
}

/** Result of a mutating marketplace call. */
export interface MarketplaceMutationResult {
  readonly ok: boolean
  readonly restartRequired?: boolean
  readonly message?: string
}

/** Registration-side Remote face used by the section. */
export interface MarketplaceSettingsSectionInjected {
  listInstalled: () => Promise<{ profileName: string; entries: readonly MarketplaceInstalledItem[] }>
  listCatalog: () => Promise<MarketplaceCatalogSnapshot>
  install: (name: string, version?: string) => Promise<MarketplaceMutationResult>
  uninstall: (name: string) => Promise<MarketplaceMutationResult>
  setEnabled: (entryId: string, enabled: boolean) => Promise<MarketplaceMutationResult>
  catalogUrls: readonly string[]
  setCatalogUrls: (value: readonly string[]) => Promise<void>
}

/** Full component props assembled by the Settings slot renderer. */
export type MarketplaceSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.pluginMarketplace'>
  & PropsRenderSlots<'settings.plugin.item'>
  & InjectFace<MarketplaceSettingsSectionInjected>

type TabId = 'discover' | 'installed' | 'configure'

type ViewState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly value: T }

/** Whether a listing matches the local query. */
function matches(haystacks: readonly string[], query: string): boolean {
  if (query.length === 0) return true
  return haystacks.some(value => value.toLocaleLowerCase().includes(query))
}

function requestInstall(
  t: MarketplaceSettingsSectionProps['t'],
  entry: MarketplaceCatalogItem,
  onInstall: (name: string, version?: string) => void,
): void {
  if (globalThis.confirm(confirmInstallMessage(t, entry))) {
    onInstall(entry.name, entry.version.length > 0 ? entry.version : undefined)
  }
}

function installedKindLabel(
  t: MarketplaceSettingsSectionProps['t'],
  kind: MarketplaceInstalledItem['kind'],
): string {
  return t(kind === 'inbox' ? 'inboxTag' : kind === 'bundle' ? 'bundleTag' : 'dependencyTag')
}



/** Render the marketplace Plugins section. */
export function MarketplaceSettingsSection({
  t, renderSlot, listInstalled, listCatalog, install, uninstall, setEnabled, catalogUrls, setCatalogUrls,
}: MarketplaceSettingsSectionProps): ReactNode {
  const tabsId = useId()
  const [tab, setTab] = useState<TabId>('discover')
  const [query, setQuery] = useState('')
  const [restart, setRestart] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [draftUrls, setDraftUrls] = useState<string[]>(
    catalogUrls.length > 0 ? [...catalogUrls] : [''],
  )
  const [savingUrl, setSavingUrl] = useState(false)
  const [busyName, setBusyName] = useState<string | null>(null)
  const [catalogRequest, setCatalogRequest] = useState(0)
  const [installedRequest, setInstalledRequest] = useState(0)
  const [catalog, setCatalog] = useState<ViewState<MarketplaceCatalogSnapshot>>({ status: 'loading' })
  const [installed, setInstalled] = useState<ViewState<readonly MarketplaceInstalledItem[]>>({ status: 'loading' })

  useEffect(() => {
    let current = true
    void Promise.resolve().then(() => listCatalog()).then(
      (snapshot) => { if (current) setCatalog({ status: 'ready', value: snapshot }) },
      () => { if (current) setCatalog({ status: 'error' }) },
    )
    return () => { current = false }
  }, [listCatalog, catalogRequest])

  useEffect(() => {
    let current = true
    void Promise.resolve().then(() => listInstalled()).then(
      (snapshot) => { if (current) setInstalled({ status: 'ready', value: snapshot.entries }) },
      () => { if (current) setInstalled({ status: 'error' }) },
    )
    return () => { current = false }
  }, [listInstalled, installedRequest])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const catalogEntries = catalog.status === 'ready' ? catalog.value.entries : []
  const installedEntries = installed.status === 'ready' ? installed.value : []
  const installedNames = useMemo(
    () => new Set(installedEntries.map(entry => entry.packageName)),
    [installedEntries],
  )
  const filteredCatalog = catalogEntries.filter(entry => matches([entry.name, entry.title, entry.description], normalizedQuery))
  const filteredInstalled = installedEntries.filter(entry => matches([entry.packageName, entry.spec], normalizedQuery))

  const refreshAll = (): void => {
    setCatalog({ status: 'loading' })
    setInstalled({ status: 'loading' })
    setCatalogRequest(value => value + 1)
    setInstalledRequest(value => value + 1)
  }

  const runMutation = async (
    name: string,
    work: () => Promise<MarketplaceMutationResult>,
  ): Promise<void> => {
    setBusyName(name)
    setNotice(null)
    const result = await work()
    setBusyName(null)
    if (!result.ok) {
      setNotice(result.message ?? t('error'))
      return
    }
    if (result.restartRequired === true) setRestart(true)
    refreshAll()
  }

  return (
    <div className={css.section} aria-busy={catalog.status === 'loading' || installed.status === 'loading'}>
      <h2 className={css.heading}>{t('title')}</h2>
      {restart ? <p className={css.restart} role="status">{t('restart')}</p> : null}
      {notice !== null ? <p className={css.failure} role="alert">{notice}</p> : null}
      <div className={css.tabs} role="tablist" aria-label={t('tabs')}>
        {(['discover', 'installed', 'configure'] as const).map((id) => {
          const selected = tab === id
          const label = id === 'discover' ? 'discoverTab' : id === 'installed' ? 'installedTab' : 'configureTab'
          return (
            <button
              key={id}
              id={`${tabsId}-tab-${id}`}
              type="button"
              role="tab"
              className={css.tab}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel-${id}`}
              data-active={selected ? 'true' : undefined}
              onClick={() => { setTab(id) }}
            >
              {t(label)}
            </button>
          )
        })}
      </div>
      <div
        id={`${tabsId}-panel-${tab}`}
        className={css.panel}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${tab}`}
      >
        {tab !== 'configure' ? (
          <label className={css.search}>
            <IconSearchOutline16 aria-hidden="true" />
            <span className={css.visuallyHidden}>{t('search')}</span>
            <input
              type="search"
              value={query}
              placeholder={t('search')}
              aria-label={t('search')}
              onChange={(event) => { setQuery(event.currentTarget.value) }}
            />
          </label>
        ) : null}
        {tab === 'discover' ? (
          <DiscoverPage
            t={t}
            catalog={catalog}
            filtered={filteredCatalog}
            installedNames={installedNames}
            busyName={busyName}
            draftUrls={draftUrls}
            savingUrl={savingUrl}
            onDraftUrls={setDraftUrls}
            onSaveUrl={async (nextUrls) => {
              setSavingUrl(true)
              const urls = (nextUrls ?? draftUrls).map(url => url.trim()).filter(url => url.length > 0)
              await setCatalogUrls(urls)
              setDraftUrls(urls.length > 0 ? urls : [''])
              setSavingUrl(false)
              setCatalog({ status: 'loading' })
              setCatalogRequest(value => value + 1)
            }}
            onRetry={() => {
              setCatalog({ status: 'loading' })
              setCatalogRequest(value => value + 1)
            }}
            onInstall={(name, version) => void runMutation(name, () => install(name, version))}
          />
        ) : null}
        {tab === 'installed' ? (
          <InstalledPage
            t={t}
            installed={installed}
            filtered={filteredInstalled}
            busyName={busyName}
            onRetry={() => {
              setInstalled({ status: 'loading' })
              setInstalledRequest(value => value + 1)
            }}
            onUninstall={name => void runMutation(name, () => uninstall(name))}
            onToggle={(entryId, enabled, packageName) => void runMutation(packageName, () => setEnabled(entryId, enabled))}
          />
        ) : null}
        {tab === 'configure' ? (
          <ConfigurePage t={t} renderCards={() => renderSlot('settings.plugin.item', {})} />
        ) : null}
      </div>
    </div>
  )
}

/** Discover tab body. */
function DiscoverPage(props: {
  t: MarketplaceSettingsSectionProps['t']
  catalog: ViewState<MarketplaceCatalogSnapshot>
  filtered: readonly MarketplaceCatalogItem[]
  installedNames: ReadonlySet<string>
  busyName: string | null
  draftUrls: readonly string[]
  savingUrl: boolean
  onDraftUrls: (value: string[]) => void
  onSaveUrl: (urls?: readonly string[]) => void
  onRetry: () => void
  onInstall: (name: string, version?: string) => void
}): ReactNode {
  const { t } = props
  const [details, setDetails] = useState<MarketplaceCatalogItem | null>(null)
  const [focusUrl, setFocusUrl] = useState<string | null>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const sources = props.catalog.status === 'ready' ? props.catalog.value.sources : []
  useEffect(() => {
    if (focusUrl === null) return
    const index = props.draftUrls.findIndex(item => item.trim() === focusUrl)
    if (index < 0) return
    const input = inputRefs.current[index]
    input?.focus()
    input?.select()
    setFocusUrl(null)
  }, [focusUrl, props.draftUrls])
  const editSource = (url: string): void => {
    if (!props.draftUrls.some(item => item.trim() === url)) {
      const next = [...props.draftUrls]
      const empty = next.findIndex(item => item.trim().length === 0)
      if (empty >= 0) next[empty] = url
      else next.push(url)
      props.onDraftUrls(next)
    }
    setFocusUrl(url)
  }
  const removeSource = (url: string): void => {
    if (!globalThis.confirm(t('confirmRemoveMarket'))) return
    const next = props.draftUrls.map(item => item.trim()).filter(item => item.length > 0 && item !== url)
    props.onDraftUrls(next.length > 0 ? next : [''])
    props.onSaveUrl(next)
  }
  return (
    <>
      <div className={css.field}>
        <span id="marketplace-catalog-urls">{t('markets')}</span>
        {props.draftUrls.map((url, index) => (
          <div className={css.marketRow} key={`market-${String(index)}`}>
            <input
              ref={(node) => { inputRefs.current[index] = node }}
              aria-labelledby="marketplace-catalog-urls"
              placeholder={t('marketUrl')}
              value={url}
              onChange={(event) => {
                const next = [...props.draftUrls]
                next[index] = event.currentTarget.value
                props.onDraftUrls(next)
              }}
            />
            <Tooltip label={t('removeMarket')} side="bottom">
              <button
                type="button"
                className={css.iconButton}
                aria-label={t('removeMarket')}
                onClick={() => {
                  const next = props.draftUrls.filter((_, itemIndex) => itemIndex !== index)
                  props.onDraftUrls(next.length > 0 ? next : [''])
                }}
              >
                <IconTrashOutline16 size={14} />
              </button>
            </Tooltip>
          </div>
        ))}
        <div className={css.actions}>
          <button
            type="button"
            className={css.button}
            onClick={() => { props.onDraftUrls([...props.draftUrls, '']) }}
          >
            {t('addMarket')}
          </button>
          <button type="button" className={css.button} disabled={props.savingUrl} onClick={() => { props.onSaveUrl() }}>
            {props.savingUrl ? t('catalogSaving') : t('catalogSave')}
          </button>
        </div>
      </div>
      {sources.length > 0 ? (
        <ul className={css.sources}>
          {sources.map(source => (
            <li key={source.url} className={css.source} data-ok={source.ok ? 'true' : 'false'}>
              <div className={css.sourceMain}>
                <strong>{source.title}</strong>
                {source.ok
                  ? <span>{source.count}</span>
                  : <span>{t('marketFailed')}{source.error !== undefined ? `: ${source.error}` : ''}</span>}
              </div>
              <div className={css.sourceActions}>
                <Tooltip label={t('editMarket')} side="bottom">
                  <button
                    type="button"
                    className={css.iconButton}
                    aria-label={t('editMarket')}
                    onClick={() => { editSource(source.url) }}
                  >
                    <IconEditOutline16 size={14} />
                  </button>
                </Tooltip>
                <Tooltip label={t('removeMarket')} side="bottom">
                  <button
                    type="button"
                    className={css.iconButton}
                    aria-label={t('removeMarket')}
                    disabled={props.savingUrl}
                    onClick={() => { removeSource(source.url) }}
                  >
                    <IconTrashOutline16 size={14} />
                  </button>
                </Tooltip>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {props.catalog.status === 'loading' ? <p className={css.status}>{t('loading')}</p> : null}
      {props.catalog.status === 'error' ? (
        <div className={css.failure}>
          <p role="alert">{t('error')}</p>
          <button type="button" className={css.button} onClick={props.onRetry}>{t('retry')}</button>
        </div>
      ) : null}
      {props.catalog.status === 'ready' && !props.catalog.value.configured
        ? <p className={css.empty}>{t('catalogUnconfigured')}</p>
        : null}
      {props.catalog.status === 'ready' && props.catalog.value.configured && props.catalog.value.entries.length === 0
        ? <p className={css.empty}>{t('catalogEmpty')}</p>
        : null}
      {props.catalog.status === 'ready' && props.catalog.value.entries.length > 0 && props.filtered.length === 0
        ? <p className={css.empty}>{t('emptySearch')}</p>
        : null}
      {props.filtered.length > 0 ? (
        <>
          <div className={css.headingRow}>
            <h3>{t('catalog')}</h3>
            <span>{props.filtered.length}</span>
          </div>
          <ul className={`${css.cards} ${css.catalogCards}`}>
            {props.filtered.map((entry) => {
              const already = props.installedNames.has(entry.name)
              const packageLabel = catalogPackageLabel(entry.name, entry.version)
              const installing = props.busyName === entry.name
              return (
                <li className={`${css.card} ${css.catalogCard}`} key={entry.name} data-plugin-name={entry.name}>
                  <div className={css.cardBody}>
                    <Tooltip
                      label={entry.description}
                      side="bottom"
                      maxWidth={280}
                      disabled={entry.description.length === 0}
                    >
                      <button
                        type="button"
                        className={css.cardHit}
                        aria-haspopup="dialog"
                        aria-label={t('openDetailsNamed', { title: entry.title })}
                        onClick={() => { setDetails(entry) }}
                      >
                        {already
                          ? <span className={css.tag}>{t('installedTag')}</span>
                          : <span className={css.tag}>{entry.sourceTitle}</span>}
                        <h3 className={css.cardTitle}>{entry.title}</h3>
                        <p className={css.packageName}>{packageLabel}</p>
                        <span className={css.description}>{entry.description}</span>
                      </button>
                    </Tooltip>
                  </div>
                  <div className={css.cardAside}>
                    <button
                      type="button"
                      className={css.button}
                      disabled={already || installing}
                      onClick={() => { requestInstall(t, entry, props.onInstall) }}
                    >
                      {installing ? t('installing') : t('install')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {details !== null ? (
            <CatalogDetailsDialog
              t={t}
              entry={details}
              already={props.installedNames.has(details.name)}
              installing={props.busyName === details.name}
              onClose={() => { setDetails(null) }}
              onInstall={() => { requestInstall(t, details, props.onInstall) }}
            />
          ) : null}
        </>
      ) : null}
    </>
  )
}

/** Installed tab body. */
function InstalledPage(props: {
  t: MarketplaceSettingsSectionProps['t']
  installed: ViewState<readonly MarketplaceInstalledItem[]>
  filtered: readonly MarketplaceInstalledItem[]
  busyName: string | null
  onRetry: () => void
  onUninstall: (name: string) => void
  onToggle: (entryId: string, enabled: boolean, packageName: string) => void
}): ReactNode {
  const { t } = props
  const [details, setDetails] = useState<MarketplaceInstalledItem | null>(null)
  return (
    <>
      {props.installed.status === 'loading' ? <p className={css.status}>{t('loading')}</p> : null}
      {props.installed.status === 'error' ? (
        <div className={css.failure}>
          <p role="alert">{t('error')}</p>
          <button type="button" className={css.button} onClick={props.onRetry}>{t('retry')}</button>
        </div>
      ) : null}
      {props.installed.status === 'ready' && props.installed.value.length === 0
        ? <p className={css.empty}>{t('installedEmpty')}</p>
        : null}
      {props.installed.status === 'ready' && props.installed.value.length > 0 && props.filtered.length === 0
        ? <p className={css.empty}>{t('emptySearch')}</p>
        : null}
      {props.filtered.length > 0 ? (
        <>
          <div className={css.headingRow}>
            <h3>{t('installedHeading')}</h3>
            <span>{props.filtered.length}</span>
          </div>
          <ul className={`${css.cards} ${css.catalogCards}`}>
            {props.filtered.map((entry) => {
              const busy = props.busyName === entry.packageName
              return (
                <li className={`${css.card} ${css.catalogCard}`} key={entry.packageName} data-plugin-name={entry.packageName}>
                  <div className={css.cardBody}>
                    <Tooltip label={installedHoverLabel(entry.packageName, entry.spec)} side="bottom" maxWidth={360}>
                      <button
                        type="button"
                        className={css.cardHit}
                        aria-haspopup="dialog"
                        aria-label={t('openDetailsNamed', { title: entry.packageName })}
                        onClick={() => { setDetails(entry) }}
                      >
                        <span className={css.tag}>{installedKindLabel(t, entry.kind)}</span>
                        <h3 className={css.cardTitle}>{entry.packageName}</h3>
                        {entry.spec.length > 0 ? <p className={css.packageName}>{entry.spec}</p> : null}
                      </button>
                    </Tooltip>
                  </div>
                  <div className={css.cardAside}>
                    {entry.canToggle && entry.entryIds[0] !== undefined ? (
                      <button
                        type="button"
                        className={css.button}
                        disabled={busy}
                        onClick={() => { props.onToggle(entry.entryIds[0]!, !entry.enabled, entry.packageName) }}
                      >
                        {entry.enabled ? t('disable') : t('enable')}
                      </button>
                    ) : null}
                    {entry.canUninstall ? (
                      <button
                        type="button"
                        className={css.button}
                        disabled={busy}
                        onClick={() => {
                          if (globalThis.confirm(t('confirmUninstall'))) props.onUninstall(entry.packageName)
                        }}
                      >
                        {busy ? t('uninstalling') : t('uninstall')}
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {details !== null ? (
            <InstalledDetailsDialog
              t={t}
              entry={details}
              busy={props.busyName === details.packageName}
              onClose={() => { setDetails(null) }}
              onToggle={entryId => {
                props.onToggle(entryId, !details.enabled, details.packageName)
              }}
              onUninstall={() => {
                if (globalThis.confirm(t('confirmUninstall'))) props.onUninstall(details.packageName)
              }}
            />
          ) : null}
        </>
      ) : null}
    </>
  )
}

function DetailsDialog(props: {
  t: MarketplaceSettingsSectionProps['t']
  title: string
  rows: readonly {
    readonly label: string
    readonly value: string
    readonly href?: string
    readonly mono?: boolean
  }[]
  description?: string
  onClose: () => void
  actions: ReactNode
}): ReactNode {
  const { t } = props
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(props.onClose)
  onCloseRef.current = props.onClose
  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => { document.removeEventListener('keydown', onKeyDown, true) }
  }, [])
  return createPortal((
    <div className={css.dialogRoot} role="presentation">
      <div className={css.dialogMask} aria-hidden="true" onClick={props.onClose} />
      <div
        className={css.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketplace-plugin-details-title"
      >
        <div className={css.dialogHeader}>
          <h2 className={css.dialogTitle} id="marketplace-plugin-details-title">{props.title}</h2>
          <button
            ref={closeRef}
            type="button"
            className={css.dialogClose}
            aria-label={t('closeDetails')}
            onClick={props.onClose}
          >
            <IconCloseOutline16 size={14} />
          </button>
        </div>
        <dl className={css.dialogMeta}>
          {props.rows.map(row => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                {row.href !== undefined
                  ? <a href={row.href} target="_blank" rel="noreferrer">{row.value}</a>
                  : row.mono === true
                    ? <code className={css.dialogCode}>{row.value}</code>
                    : row.value}
              </dd>
            </div>
          ))}
        </dl>
        {props.description !== undefined
          ? <p className={css.dialogDescription}>{props.description}</p>
          : null}
        <div className={css.dialogFooter}>
          <button type="button" className={css.button} onClick={props.onClose}>{t('closeDetails')}</button>
          {props.actions}
        </div>
      </div>
    </div>
  ), document.body)
}

function CatalogDetailsDialog(props: {
  t: MarketplaceSettingsSectionProps['t']
  entry: MarketplaceCatalogItem
  already: boolean
  installing: boolean
  onClose: () => void
  onInstall: () => void
}): ReactNode {
  const { t, entry } = props
  const rows = [
    { label: t('detailsPackage'), value: catalogPackageLabel(entry.name, entry.version), mono: true },
    { label: t('detailsKind'), value: t(entry.kind === 'bundle' ? 'bundleTag' : 'pluginTag') },
    { label: t('detailsSource'), value: entry.sourceTitle },
    ...entry.homepage.length > 0
      ? [{ label: t('detailsHomepage'), value: entry.homepage, href: entry.homepage }]
      : [],
  ]
  return (
    <DetailsDialog
      t={t}
      title={entry.title}
      rows={rows}
      description={entry.description.length > 0 ? entry.description : t('detailsNoDescription')}
      onClose={props.onClose}
      actions={(
        <button
          type="button"
          className={css.button}
          disabled={props.already || props.installing}
          onClick={props.onInstall}
        >
          {props.already ? t('installedTag') : props.installing ? t('installing') : t('install')}
        </button>
      )}
    />
  )
}

function InstalledDetailsDialog(props: {
  t: MarketplaceSettingsSectionProps['t']
  entry: MarketplaceInstalledItem
  busy: boolean
  onClose: () => void
  onToggle: (entryId: string) => void
  onUninstall: () => void
}): ReactNode {
  const { t, entry } = props
  const rows = [
    { label: t('detailsPackage'), value: entry.packageName, mono: true },
    { label: t('detailsKind'), value: installedKindLabel(t, entry.kind) },
    ...entry.spec.length > 0 ? [{ label: t('detailsSpec'), value: entry.spec, mono: true }] : [],
    { label: t('detailsStatus'), value: entry.enabled ? t('enabledTag') : t('disabledTag') },
    ...entry.entryIds.length > 0
      ? [{ label: t('detailsEntries'), value: entry.entryIds.join('\n'), mono: true }]
      : [],
    ...entry.fiberPhase !== null
      ? [{ label: t('detailsPhase'), value: entry.fiberPhase, mono: true }]
      : [],
  ]
  return (
    <DetailsDialog
      t={t}
      title={entry.packageName}
      rows={rows}
      onClose={props.onClose}
      actions={(
        <>
          {entry.canToggle && entry.entryIds[0] !== undefined ? (
            <button
              type="button"
              className={css.button}
              disabled={props.busy}
              onClick={() => { props.onToggle(entry.entryIds[0]!) }}
            >
              {entry.enabled ? t('disable') : t('enable')}
            </button>
          ) : null}
          {entry.canUninstall ? (
            <button
              type="button"
              className={css.button}
              disabled={props.busy}
              onClick={props.onUninstall}
            >
              {props.busy ? t('uninstalling') : t('uninstall')}
            </button>
          ) : null}
        </>
      )}
    />
  )
}

function ConfigurePage(props: {
  t: MarketplaceSettingsSectionProps['t']
  renderCards: () => ReactNode
}): ReactNode {
  const cards = props.renderCards()
  return (
    <>
      <div className={css.headingRow}>
        <h3>{props.t('cards')}</h3>
      </div>
      <ul className={css.configList}>{cards}</ul>
    </>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Plugin marketplace copy. */
    'settings.pluginMarketplace': MarketplaceLocaleKey
  }
}
