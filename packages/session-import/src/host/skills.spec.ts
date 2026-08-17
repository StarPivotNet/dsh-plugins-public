import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copySkill, parseSkillFile } from './skills.ts'

test('parseSkillFile reads frontmatter', () => {
  const skill = parseSkillFile('---\nname: define-goal\ndescription: Shape a goal\n---\n\n# Define\n', 'codex', '/tmp/define-goal/SKILL.md')
  assert.equal(skill?.name, 'define-goal')
  assert.equal(skill?.description, 'Shape a goal')
})

test('copySkill writes a DSH skill bundle', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-import-skill-'))
  const source = join(root, 'src', 'define-goal.md')
  await mkdir(join(root, 'src'), { recursive: true })
  await writeFile(source, '---\nname: define-goal\ndescription: Shape a goal\n---\n\nBody\n')
  const parsed = parseSkillFile(await readFile(source, 'utf8'), 'codex', source)
  assert.ok(parsed)
  const copied = await copySkill(parsed, join(root, 'skills'))
  const written = await readFile(copied.path, 'utf8')
  assert.match(written, /name: define-goal/)
  assert.match(written, /Body/)
})
