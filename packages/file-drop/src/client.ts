/** Client interceptor: non-image drops become composer paths. */

import {
  collectDropPaths,
  formatDroppedPaths,
  joinInsertion,
  shouldClaimTransfer,
  type DroppedFile,
} from './logic.ts'

export const CHANNEL = '/file-drop'

type RpcResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } }

export interface FileDropRpc {
  call: (channel: string, endpoint: string, payload: unknown) => Promise<RpcResult<{ path: string }>>
}

export interface FileDropLabels {
  title: string
  desc: string
}

function droppedFromFile(file: File): DroppedFile {
  const path = 'path' in file && typeof (file as File & { path?: unknown }).path === 'string'
    ? (file as File & { path: string }).path
    : undefined
  return { name: file.name, type: file.type, size: file.size, ...(path === undefined || path.length === 0 ? {} : { path }) }
}

function fileTransfer(event: DragEvent): DataTransfer | null {
  const data = event.dataTransfer
  if (data === null) return null
  if (data.types.includes('application/x-dsh-tab')) return null
  if (event.target instanceof Element && event.target.closest('[data-dsh-better-sidebar]') !== null) return null
  if (data.types.includes('Files') || data.types.includes('text/uri-list')) return data
  return null
}

function activeComposer(): HTMLTextAreaElement | null {
  const cards = document.querySelectorAll<HTMLElement>('[data-composer-card]')
  for (let i = cards.length - 1; i >= 0; i -= 1) {
    const card = cards[i]
    if (card === undefined) continue
    const textarea = card.querySelector('textarea')
    if (textarea instanceof HTMLTextAreaElement && !textarea.disabled && !textarea.readOnly) return textarea
  }
  return null
}

function insertIntoComposer(chunk: string): boolean {
  const target = activeComposer()
  if (target === null) return false
  const { next, caret } = joinInsertion(target.value, chunk)
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  if (nativeSetter === undefined) return false
  nativeSetter.call(target, next)
  target.setSelectionRange(caret, caret)
  target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromDrop', data: chunk }))
  target.focus({ preventScroll: true })
  return true
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 32768
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk))
  }
  return btoa(binary)
}

function showOverlay(labels: FileDropLabels): HTMLElement {
  const existing = document.getElementById('dsh-file-drop-overlay')
  if (existing !== null) return existing
  const mask = document.createElement('div')
  mask.id = 'dsh-file-drop-overlay'
  mask.setAttribute('role', 'status')
  mask.style.cssText = [
    'position:fixed;inset:0;z-index:1100;pointer-events:none;display:flex;',
    'align-items:center;justify-content:center;padding:40px;',
    'background:var(--dsw-alias-bg-mask-drop, rgba(0,0,0,.45));',
    'backdrop-filter:blur(10px);color:var(--dsw-alias-label-primary,#fff);text-align:center;',
  ].join('')
  const wrap = document.createElement('div')
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;max-width:520px;'
  const title = document.createElement('div')
  title.dataset.role = 'title'
  title.style.cssText = 'font:var(--dsw-font-l-20, 20px/28px sans-serif);margin-top:16px;'
  title.textContent = labels.title
  const desc = document.createElement('div')
  desc.dataset.role = 'desc'
  desc.style.cssText = 'font:var(--dsw-font-s-14, 14px/22px sans-serif);color:var(--dsw-alias-label-tertiary,#bbb);margin-top:16px;white-space:pre-wrap;'
  desc.textContent = labels.desc
  wrap.append(title, desc)
  mask.append(wrap)
  document.body.append(mask)
  return mask
}

function updateOverlay(labels: FileDropLabels): void {
  const mask = document.getElementById('dsh-file-drop-overlay')
  if (mask === null) return
  const title = mask.querySelector('[data-role=title]')
  const desc = mask.querySelector('[data-role=desc]')
  if (title !== null) title.textContent = labels.title
  if (desc !== null) desc.textContent = labels.desc
}

function hideOverlay(): void {
  document.getElementById('dsh-file-drop-overlay')?.remove()
}

function clearStockOverlay(): void {
  window.dispatchEvent(new Event('dragend'))
}

export interface FileDropInterceptorOptions {
  rpc: FileDropRpc
  labels: FileDropLabels
  toast?: (text: string) => void
}

/**
 * Capture-phase document listeners that steal non-image file drops.
 * Image-only batches pass through to the stock attachment plugin.
 */
function defaultToast(text: string): void {
  const existing = document.getElementById('dsh-file-drop-toast')
  existing?.remove()
  const toast = document.createElement('div')
  toast.id = 'dsh-file-drop-toast'
  toast.setAttribute('role', 'status')
  toast.textContent = text
  toast.style.cssText = [
    'position:fixed;z-index:1200;left:50%;bottom:88px;transform:translateX(-50%);',
    'max-width:min(560px,calc(100vw - 32px));padding:10px 14px;border-radius:10px;',
    'background:var(--dsw-alias-bg-float, #2a2a2e);color:var(--dsw-alias-label-primary,#fff);',
    'font:var(--dsw-font-s-14, 14px/22px sans-serif);box-shadow:var(--dsw-shadow-lv3, 0 8px 24px rgba(0,0,0,.35));',
    'white-space:pre-wrap;',
  ].join('')
  document.body.append(toast)
  window.setTimeout(() => { toast.remove() }, 4000)
}

export function installFileDropInterceptor(options: FileDropInterceptorOptions): () => void {
  let depth = 0
  let takingOver = false
  let busy = false

  const hideOurs = (): void => {
    depth = 0
    takingOver = false
    hideOverlay()
  }

  const classify = (data: DataTransfer, forDrop: boolean): boolean => {
    const files = [...data.files].map(droppedFromFile)
    const items = data.items
    const itemTypes: string[] = []
    let hasDirectory = false
    if (items !== undefined) {
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]
        if (item === undefined || item.kind !== 'file') continue
        itemTypes.push(item.type)
        const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null
        if (entry !== null && entry.isDirectory) hasDirectory = true
      }
    }
    return shouldClaimTransfer({
      files,
      itemTypes,
      hasDirectory,
      uriListAvailable: data.types.includes('text/uri-list'),
      forDrop,
    })
  }

  const claim = (event: DragEvent, data: DataTransfer): void => {
    event.preventDefault()
    event.stopPropagation()
    data.dropEffect = 'copy'
    showOverlay(options.labels)
    updateOverlay(options.labels)
  }

  const onDragEnter = (event: DragEvent): void => {
    const data = fileTransfer(event)
    if (data === null) return
    takingOver = classify(data, false)
    if (!takingOver) return
    depth += 1
    claim(event, data)
  }

  const onDragOver = (event: DragEvent): void => {
    const data = fileTransfer(event)
    if (data === null) return
    takingOver = classify(data, false)
    if (!takingOver) return
    claim(event, data)
  }

  const onDragLeave = (event: DragEvent): void => {
    if (fileTransfer(event) === null) return
    if (!takingOver) return
    depth = Math.max(0, depth - 1)
    if (depth === 0) hideOurs()
  }

  const onDrop = (event: DragEvent): void => {
    const data = fileTransfer(event)
    if (data === null) return
    const files = [...data.files]
    const uriList = data.getData('text/uri-list') || data.getData('text/plain')
    const takeoverNow = classify(data, true) || (files.length === 0 && uriList.length > 0)
    if (!takeoverNow) {
      hideOurs()
      return
    }
    event.preventDefault()
    event.stopPropagation()
    hideOurs()
    clearStockOverlay()
    if (busy) return
    busy = true
    void handleDrop(files, uriList, { ...options, toast: options.toast ?? defaultToast }).finally(() => { busy = false })
  }

  document.addEventListener('dragenter', onDragEnter, true)
  document.addEventListener('dragover', onDragOver, true)
  document.addEventListener('dragleave', onDragLeave, true)
  document.addEventListener('drop', onDrop, true)
  window.addEventListener('dragend', hideOurs)
  return () => {
    document.removeEventListener('dragenter', onDragEnter, true)
    document.removeEventListener('dragover', onDragOver, true)
    document.removeEventListener('dragleave', onDragLeave, true)
    document.removeEventListener('drop', onDrop, true)
    window.removeEventListener('dragend', hideOurs)
    hideOverlay()
  }
}

async function handleDrop(files: File[], uriList: string, options: FileDropInterceptorOptions): Promise<void> {
  const collected = collectDropPaths(files.map(droppedFromFile), uriList)
  const paths = [...collected.known]
  const failures: string[] = []
  const missingFiles = collected.missing
    .map(item => files.find(file => file.name === item.name && file.type === item.type && file.size === item.size))
    .filter((file): file is File => file !== undefined)

  for (const file of missingFiles) {
    try {
      const data = await fileToBase64(file)
      const payload = await options.rpc.call(CHANNEL, 'stage', { name: file.name, mediaType: file.type, data })
      if (!payload.ok) throw new Error(payload.error.message)
      paths.push(payload.value.path)
    } catch (error) {
      failures.push(file.name + ': ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  if (paths.length > 0) {
    const chunk = formatDroppedPaths(paths)
    if (!insertIntoComposer(chunk)) {
      options.toast?.('无法写入输入框：' + chunk)
    }
  }
  if (failures.length > 0) options.toast?.(failures.join('\n'))
}
