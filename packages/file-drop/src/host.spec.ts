import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stageDroppedFile } from './host.ts'

const limits = { maxStageBytes: 1024, briefBytes: 32 }

test('stageDroppedFile writes unique files under the staging directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-file-drop-'))
  try {
    const bytes = Buffer.from('hello world')
    const first = await stageDroppedFile(
      { name: 'note.txt', data: bytes.toString('base64') },
      { ...limits, stageDir: dir },
    )
    const second = await stageDroppedFile(
      { name: 'note.txt', data: bytes.toString('base64') },
      { ...limits, stageDir: dir },
    )
    assert.equal(first.staged, true)
    assert.notEqual(first.path, second.path)
    assert.equal(await readFile(first.path ?? '', 'utf8'), 'hello world')
    assert.match(first.path ?? '', /note\.txt$/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('stageDroppedFile keeps large files as a brief and does not write them', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-file-drop-'))
  try {
    const brief = await stageDroppedFile(
      { name: 'movie.mp4', size: 40, data: '' },
      { ...limits, stageDir: dir },
    )
    assert.deepEqual(brief, { name: 'movie.mp4', size: 40, tooLarge: true })
    assert.deepEqual(await readdir(dir), [])
    const encoded = await stageDroppedFile(
      { name: 'a.bin', data: Buffer.alloc(40).toString('base64') },
      { ...limits, stageDir: dir },
    )
    assert.equal(encoded.tooLarge, true)
    assert.equal(encoded.path, undefined)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('stageDroppedFile refuses empty payloads without a declared size', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-file-drop-'))
  try {
    await assert.rejects(
      () => stageDroppedFile({ name: 'a.bin', data: '' }, { ...limits, stageDir: dir }),
      /missing data/
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
