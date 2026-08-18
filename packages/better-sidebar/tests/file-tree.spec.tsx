/**
 * FileTree multi-root explorer: a workspace with additional folders renders
 * each folder as a sibling root; a single cwd still paints one tree.
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { FileTree, isRootExpanded, nextExpandedForRoot, ROOT_FOLD_SEEDED } from '../src/client/FileTree.tsx'
import { api } from '../src/client/api.ts'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  vi.restoreAllMocks()
})

function mountTree(options: {
  folders?: readonly string[]
  expanded?: string[]
  onToggle?: (path: string) => void
} = {}): { container: HTMLDivElement; unmount: () => void } {
  vi.spyOn(api, 'fsTree').mockResolvedValue({ path: '/unused', entries: [], truncated: false })
  const container = document.createElement('div')
  document.body.append(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(createElement(FileTree, {
      sessionId: 's1',
      cwd: '/work/proj',
      folders: options.folders ?? [],
      expanded: options.expanded ?? [],
      onToggle: options.onToggle ?? (() => {}),
      onOpenFile: () => {},
      onReferenceFile: () => {},
      refreshTick: 0,
    }))
  })
  return {
    container,
    unmount: () => {
      act(() => { root.unmount() })
      container.remove()
    },
  }
}

describe('FileTree workspace roots', () => {
  it('renders one root for a single-folder workspace', () => {
    const { container, unmount } = mountTree({})
    try {
      const names = [...container.querySelectorAll('span')].map(node => node.textContent)
      expect(names.filter(name => name === 'proj')).toHaveLength(1)
      expect(names).not.toContain('shared')
    } finally {
      unmount()
    }
  })

  it('renders every additional workspace folder as a sibling root', () => {
    const { container, unmount } = mountTree({ folders: ['/libs/shared', '/generated'] })
    try {
      const names = [...container.querySelectorAll('span')].map(node => node.textContent)
      expect(names).toContain('proj')
      expect(names).toContain('shared')
      expect(names).toContain('generated')
      expect(container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(3)
    } finally {
      unmount()
    }
  })

  it('collapses a workspace root after the first toggle', () => {
    const toggles: string[] = []
    const { container, unmount } = mountTree({
      folders: ['/libs/shared'],
      onToggle: (path) => { toggles.push(path) },
    })
    try {
      const row = [...container.querySelectorAll('[role="button"]')]
        .find(node => node.textContent?.includes('shared'))
      expect(row?.getAttribute('aria-expanded')).toBe('true')
      act(() => { (row as HTMLElement).click() })
      expect(toggles).toEqual(['/libs/shared'])
    } finally {
      unmount()
    }
  })

  it('keeps other roots open when the first root fold is seeded', () => {
    expect(isRootExpanded([], '/work/proj')).toBe(true)
    expect(nextExpandedForRoot([], ['/work/proj', '/libs/shared'], '/work/proj')).toEqual([
      ROOT_FOLD_SEEDED,
      '/libs/shared',
    ])
    expect(isRootExpanded([ROOT_FOLD_SEEDED, '/libs/shared'], '/work/proj')).toBe(false)
    expect(isRootExpanded([ROOT_FOLD_SEEDED, '/libs/shared'], '/libs/shared')).toBe(true)
  })
})
