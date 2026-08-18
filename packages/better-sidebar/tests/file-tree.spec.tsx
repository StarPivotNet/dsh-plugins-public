/**
 * FileTree multi-root explorer: a workspace with additional folders renders
 * each folder as a sibling root; a single cwd still paints one tree.
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { FileTree } from '../src/client/FileTree.tsx'
import { api } from '../src/client/api.ts'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  vi.restoreAllMocks()
})

function mountTree(folders: readonly string[] = []): { container: HTMLDivElement; unmount: () => void } {
  vi.spyOn(api, 'fsTree').mockResolvedValue({ path: '/unused', entries: [], truncated: false })
  const container = document.createElement('div')
  document.body.append(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(createElement(FileTree, {
      sessionId: 's1',
      cwd: '/work/proj',
      folders,
      expanded: [],
      onToggle: () => {},
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
    const { container, unmount } = mountTree()
    try {
      const names = [...container.querySelectorAll('span')].map(node => node.textContent)
      expect(names.filter(name => name === 'proj')).toHaveLength(1)
      expect(names).not.toContain('shared')
    } finally {
      unmount()
    }
  })

  it('renders every additional workspace folder as a sibling root', () => {
    const { container, unmount } = mountTree(['/libs/shared', '/generated'])
    try {
      const names = [...container.querySelectorAll('span')].map(node => node.textContent)
      expect(names).toContain('proj')
      expect(names).toContain('shared')
      expect(names).toContain('generated')
    } finally {
      unmount()
    }
  })
})
