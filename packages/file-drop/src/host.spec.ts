import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stageDroppedFile } from './host.ts'

test('stageDroppedFile writes unique files under the staging directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-file-drop-'))
  try {
    const bytes = Buffer.from('hello world')
    const first = await stageDroppedFile(
      { name: 'note.txt', data: bytes.toString('base64') },
      { maxStageBytes: 1024, stageDir: dir },
    )
    const second = await stageDroppedFile(
      { name: 'note.txt', data: bytes.toString('base64') },
      { maxStageBytes: 1024, stageDir: dir },
    )
    assert.notEqual(first.path, second.path)
    assert.equal(await readFile(first.path, 'utf8'), 'hello world')
    assert.match(first.path, /note\.txt$/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('stageDroppedFile refuses oversize and empty payloads', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-file-drop-'))
  try {
    await assert.rejects(
      () => stageDroppedFile({ name: 'a.bin', data: Buffer.alloc(8).toString('base64') }, { maxStageBytes: 4, stageDir: dir }),
      /exceeds/
    )
    await assert.rejects(
      () => stageDroppedFile({ name: 'a.bin', data: '' }, { maxStageBytes: 4, stageDir: dir }),
      /missing data/
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
