/** Plugins marketplace section: discover + installed pages plus Host cards. */

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import {
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
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
  catalogUrl: string
  setCatalogUrl: (value: string) => Promise<void>
}

/** Full component props assembled by the Settings slot renderer. */
export type MarketplaceSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.pluginMarketplace'>
  & PropsRenderSlots<'settings.plugin.item'>
  & InjectFace<MarketplaceSettingsSectionInjected>

type TabId = 'discover' | 'installed'

type ViewState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly value: T }

/** Whether a listing matches the local query. */
function matches(haystacks: readonly string[], query: string): boolean {
  if (query.length === 0) return true
  return haystacks.some(value => value.toLocaleLowerCase().includes(query))
}

/** Render the marketplace Plugins section. */
export function MarketplaceSettingsSection({
  t, renderSlot, listInstalled, listCatalog, install, uninstall, setEnabled, catalogUrl, setCatalogUrl,
}: MarketplaceSettingsSectionProps): ReactNode {
  const tabsId = useId()
  const [tab, setTab] = useState<TabId>('discover')
  const [query, setQuery] = useState('')
  const [restart, setRestart] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [draftUrl, setDraftUrl] = useState(catalogUrl)
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
      <p className={css.intro}>{t('intro')}</p>
      {restart ? <p className={css.restart} role="status">{t('restart')}</p> : null}
      {notice !== null ? <p className={css.failure} role="alert">{notice}</p> : null}
      <div className={css.tabs} role="tablist" aria-label={t('tabs')}>
        {(['discover', 'installed'] as const).map((id) => {
          const selected = tab === id
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
              {t(id === 'discover' ? 'discoverTab' : 'installedTab')}
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
        {tab === 'discover' ? (
          <DiscoverPage
            t={t}
            catalog={catalog}
            filtered={filteredCatalog}
            installedNames={installedNames}
            busyName={busyName}
            draftUrl={draftUrl}
            savingUrl={savingUrl}
            onDraftUrl={setDraftUrl}
            onSaveUrl={async () => {
              setSavingUrl(true)
              await setCatalogUrl(draftUrl.trim())
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
        ) : (
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
            renderCards={() => renderSlot('settings.plugin.item', {})}
          />
        )}
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
  draftUrl: string
  savingUrl: boolean
  onDraftUrl: (value: string) => void
  onSaveUrl: () => void
  onRetry: () => void
  onInstall: (name: string, version?: string) => void
}): ReactNode {
  const { t } = props
  return (
    <>
      <div className={css.field}>
        <label htmlFor="marketplace-catalog-url">{t('catalogUrl')}</label>
        <input
          id="marketplace-catalog-url"
          value={props.draftUrl}
          onChange={(event) => { props.onDraftUrl(event.currentTarget.value) }}
        />
        <p className={css.hint}>{t('catalogUrlHint')}</p>
        <button type="button" className={css.button} disabled={props.savingUrl} onClick={props.onSaveUrl}>
          {props.savingUrl ? t('catalogSaving') : t('catalogSave')}
        </button>
      </div>
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
          <ul className={css.cards}>
            {props.filtered.map((entry) => {
              const already = props.installedNames.has(entry.name)
              return (
                <li className={css.card} key={entry.name} data-plugin-name={entry.name}>
                  <div className={css.cardTop}>
                    <h3 className={css.cardTitle}>{entry.title}</h3>
                    {already ? <span className={css.tag}>{t('installedTag')}</span> : null}
                  </div>
                  <p className={css.packageName}>{entry.name}{entry.version.length > 0 ? `@${entry.version}` : ''}</p>
                  <p className={css.description}>{entry.description}</p>
                  <div className={css.actions}>
                    <button
                      type="button"
                      className={css.button}
                      disabled={already || props.busyName === entry.name}
                      onClick={() => {
                        if (globalThis.confirm(t('confirmInstall'))) {
                          props.onInstall(entry.name, entry.version.length > 0 ? entry.version : undefined)
                        }
                      }}
                    >
                      {props.busyName === entry.name ? t('installing') : t('install')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
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
  renderCards: () => ReactNode
}): ReactNode {
  const { t } = props
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
          <ul className={css.list}>
            {props.filtered.map((entry) => (
              <li className={css.card} key={entry.packageName} data-plugin-name={entry.packageName}>
                <div className={css.cardTop}>
                  <h3 className={css.cardTitle}>{entry.packageName}</h3>
                  <span className={css.tag}>
                    {t(entry.kind === 'inbox' ? 'inboxTag' : entry.kind === 'bundle' ? 'bundleTag' : 'dependencyTag')}
                  </span>
                </div>
                {entry.spec.length > 0 ? <p className={css.packageName}>{entry.spec}</p> : null}
                <div className={css.actions}>
                  {entry.canToggle && entry.entryIds[0] !== undefined ? (
                    <button
                      type="button"
                      className={css.button}
                      disabled={props.busyName === entry.packageName}
                      onClick={() => { props.onToggle(entry.entryIds[0]!, !entry.enabled, entry.packageName) }}
                    >
                      {entry.enabled ? t('disable') : t('enable')}
                    </button>
                  ) : null}
                  {entry.canUninstall ? (
                    <button
                      type="button"
                      className={css.button}
                      disabled={props.busyName === entry.packageName}
                      onClick={() => {
                        if (globalThis.confirm(t('confirmUninstall'))) props.onUninstall(entry.packageName)
                      }}
                    >
                      {props.busyName === entry.packageName ? t('uninstalling') : t('uninstall')}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className={css.headingRow}>
        <h3>{t('cards')}</h3>
      </div>
      <ul className={css.cards}>{props.renderCards()}</ul>
    </>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Plugin marketplace copy. */
    'settings.pluginMarketplace': MarketplaceLocaleKey
  }
}
