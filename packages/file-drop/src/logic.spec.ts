import assert from 'node:assert/strict'
import test from 'node:test'
import {
  basename,
  fileUrlToPath,
  formatByteSize,
  formatDroppedBrief,
  formatDroppedBriefs,
  formatDroppedPaths,
  isBriefOnly,
  isImageMediaType,
  joinInsertion,
  parseUriList,
  quotePath,
  collectDropPaths,
  resolveDroppedPath,
  safeDroppedName,
  shouldClaimTransfer,
  shouldTakeOver,
} from './logic.ts'

test('image MIME matches the stock composer allow-list', () => {
  assert.equal(isImageMediaType('image/png'), true)
  assert.equal(isImageMediaType('image/jpeg'), true)
  assert.equal(isImageMediaType('image/webp'), true)
  assert.equal(isImageMediaType('image/gif'), true)
  assert.equal(isImageMediaType('image/heic'), false)
  assert.equal(isImageMediaType('application/pdf'), false)
  assert.equal(isImageMediaType(''), false)
})

test('takeover leaves all-image batches to the stock handler', () => {
  assert.equal(shouldTakeOver([{ type: 'image/png' }, { type: 'image/jpeg' }], false), false)
  assert.equal(shouldTakeOver([{ type: 'image/png' }, { type: 'text/plain' }], false), true)
  assert.equal(shouldTakeOver([{ type: '' }], false), true)
  assert.equal(shouldTakeOver([{ name: 'shot.png', type: '' }], false), false)
  assert.equal(shouldTakeOver([], false), false)
  assert.equal(shouldTakeOver([], true), true)
  assert.equal(shouldTakeOver([{ type: 'image/png' }], true), true)
})

test('drag-time claim needs a typed non-image or a directory', () => {
  assert.equal(shouldClaimTransfer({
    files: [], itemTypes: [], hasDirectory: false, uriListAvailable: true, forDrop: false,
  }), false)
  assert.equal(shouldClaimTransfer({
    files: [], itemTypes: ['image/png'], hasDirectory: false, uriListAvailable: true, forDrop: false,
  }), false)
  assert.equal(shouldClaimTransfer({
    files: [], itemTypes: ['text/plain'], hasDirectory: false, uriListAvailable: false, forDrop: false,
  }), true)
  assert.equal(shouldClaimTransfer({
    files: [], itemTypes: [], hasDirectory: true, uriListAvailable: false, forDrop: false,
  }), true)
  assert.equal(shouldClaimTransfer({
    files: [{ type: 'image/png' }], itemTypes: ['image/png'], hasDirectory: false, uriListAvailable: true, forDrop: true,
  }), false)
  assert.equal(shouldClaimTransfer({
    files: [], itemTypes: [], hasDirectory: false, uriListAvailable: true, forDrop: true,
  }), true)
  assert.equal(shouldClaimTransfer({
    files: [{ name: 'shot.png', type: '' }], itemTypes: [''], hasDirectory: false, uriListAvailable: true, forDrop: true,
  }), false)
})

test('file URLs become local paths', () => {
  assert.equal(fileUrlToPath('file:///Users/me/a.ts'), '/Users/me/a.ts')
  assert.equal(fileUrlToPath('file:///C:/Users/me/a.ts'), 'C:/Users/me/a.ts')
  assert.equal(fileUrlToPath('https://example.com/a.ts'), null)
  assert.equal(fileUrlToPath('file:///Users/me/My%20File.ts'), '/Users/me/My File.ts')
})

test('uri-list parsing skips comments and keeps local paths', () => {
  assert.deepEqual(parseUriList('# comment\nfile:///tmp/a.ts\n/tmp/b.ts\n'), ['/tmp/a.ts', '/tmp/b.ts'])
  assert.deepEqual(parseUriList('C:\\Users\\me\\a.ts'), ['C:\\Users\\me\\a.ts'])
})

test('path resolution prefers File.path then unique URI basename', () => {
  assert.equal(resolveDroppedPath({ name: 'a.ts', path: '/tmp/a.ts' }, []), '/tmp/a.ts')
  assert.equal(resolveDroppedPath({ name: 'a.ts' }, ['/tmp/a.ts']), '/tmp/a.ts')
  assert.equal(resolveDroppedPath({ name: 'a.ts' }, ['/tmp/a.ts', '/opt/a.ts']), undefined)
  assert.equal(resolveDroppedPath({ name: 'a.ts' }, ['/tmp/b.ts']), undefined)
})

test('quoted paths survive spaces', () => {
  assert.equal(quotePath('/tmp/a.ts'), '/tmp/a.ts')
  assert.equal(quotePath('/tmp/my file.ts'), '"/tmp/my file.ts"')
  assert.equal(formatDroppedPaths(['/tmp/a.ts', '/tmp/my file.ts']), '/tmp/a.ts\n"/tmp/my file.ts"')
})

test('joinInsertion appends with a newline when needed', () => {
  assert.deepEqual(joinInsertion('', '/tmp/a.ts'), { next: '/tmp/a.ts', caret: '/tmp/a.ts'.length })
  assert.deepEqual(joinInsertion('hello', '/tmp/a.ts'), { next: 'hello\n/tmp/a.ts', caret: 'hello\n/tmp/a.ts'.length })
  assert.deepEqual(joinInsertion('hello\n', '/tmp/a.ts'), { next: 'hello\n/tmp/a.ts', caret: 'hello\n/tmp/a.ts'.length })
})

test('collectDropPaths uses File.path, unique URIs, then leftover files', () => {
  assert.deepEqual(
    collectDropPaths([{ name: 'a.ts', type: 'text/plain', path: '/tmp/a.ts' }], 'file:///tmp/a.ts'),
    { known: ['/tmp/a.ts'], missing: [] },
  )
  assert.deepEqual(
    collectDropPaths([{ name: 'a.ts', type: 'text/plain' }], 'file:///tmp/a.ts'),
    { known: ['/tmp/a.ts'], missing: [] },
  )
  assert.deepEqual(
    collectDropPaths([{ name: 'a.ts', type: 'text/plain' }], ''),
    { known: [], missing: [{ name: 'a.ts', type: 'text/plain' }] },
  )
  assert.deepEqual(
    collectDropPaths([], 'file:///tmp/project'),
    { known: ['/tmp/project'], missing: [] },
  )
})

test('large files render as a brief, not full content', () => {
  assert.equal(isBriefOnly(255 * 1024), false)
  assert.equal(isBriefOnly(256 * 1024), true)
  assert.equal(formatByteSize(1536), '1.5 KB')
  assert.equal(formatDroppedBrief({ name: 'a.ts', path: '/tmp/a.ts', size: 12 }), '/tmp/a.ts (12 B)')
  assert.equal(
    formatDroppedBrief({ name: 'movie.mp4', path: '/tmp/movie.mp4', size: 2 * 1024 * 1024, tooLarge: true }),
    '/tmp/movie.mp4 (2.0 MB, large file)',
  )
  assert.equal(
    formatDroppedBriefs([{ name: 'a.ts', path: '/tmp/a.ts', size: 12 }, { name: 'b.bin', size: 300000, tooLarge: true }]),
    '/tmp/a.ts (12 B)\nb.bin (293.0 KB, large file)',
  )
})

test('safe dropped names stay on one path segment', () => {
  assert.equal(safeDroppedName('../../etc/passwd'), 'passwd')
  assert.equal(safeDroppedName('my file.ts'), 'my_file.ts')
  assert.equal(safeDroppedName(''), 'dropped.bin')
  assert.equal(basename('/tmp/dir/file.ts'), 'file.ts')
})
