/** Copy Claude / Codex / Cursor skills into a DSH skill root. */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { kebabName } from '../convert/text.ts'
import type { DiscoveredSkill, ImportSource } from '../convert/types.ts'

/** Default skill directories next to each foreign agent home. */
export function defaultSkillRoots(home = homedir()): Record<ImportSource, readonly string[]> {
  return {
    claude: [
      join(home, '.claude', 'skills'),
      join(home, '.claude', 'commands'),
    ],
    codex: [
      join(home, '.codex', 'skills'),
    ],
    cursor: [
      join(home, '.cursor', 'skills'),
      join(home, '.cursor', 'commands'),
    ],
  }
}

/** Discover SKILL.md bundles and flat Markdown commands. */
export async function discoverSkills(
  roots: Record<ImportSource, readonly string[]>,
  signal?: AbortSignal,
): Promise<DiscoveredSkill[]> {
  const found: DiscoveredSkill[] = []
  for (const source of ['claude', 'codex', 'cursor'] as const) {
    for (const root of roots[source]) {
      signal?.throwIfAborted()
      await visitSkillRoot(root, source, found)
    }
  }
  found.sort((left, right) => left.name.localeCompare(right.name) || left.path.localeCompare(right.path))
  return found
}

/** Copy one discovered skill into `<targetRoot>/<name>/SKILL.md`. */
export async function copySkill(
  skill: DiscoveredSkill,
  targetRoot: string,
): Promise<{ readonly path: string; readonly overwritten: boolean }> {
  const directory = join(targetRoot, skill.name)
  const target = join(directory, 'SKILL.md')
  await mkdir(directory, { recursive: true })
  let overwritten = false
  try {
    await readFile(target)
    overwritten = true
  } catch {
    overwritten = false
  }
  const body = ensureFrontmatter(skill)
  await writeFile(target, body, 'utf8')
  return { path: target, overwritten }
}

/** Walk one skill root. */
async function visitSkillRoot(
  root: string,
  source: ImportSource,
  found: DiscoveredSkill[],
): Promise<void> {
  const { readdir, readFile, stat } = await import('node:fs/promises')
  let entries
  try { entries = await readdir(root, { withFileTypes: true }) }
  catch { return }
  for (const entry of entries) {
    const full = join(root, entry.name)
    if (entry.isDirectory()) {
      const skillFile = join(full, 'SKILL.md')
      try {
        const info = await stat(skillFile)
        if (!info.isFile()) continue
        const parsed = parseSkillFile(await readFile(skillFile, 'utf8'), source, skillFile)
        if (parsed !== undefined) found.push(parsed)
      } catch {
        continue
      }
      continue
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue
    if (entry.name.toLowerCase() === 'readme.md') continue
    try {
      const parsed = parseSkillFile(await readFile(full, 'utf8'), source, full)
      if (parsed !== undefined) found.push(parsed)
    } catch {
      continue
    }
  }
}

/** Parse YAML frontmatter plus Markdown body into a skill record. */
export function parseSkillFile(text: string, source: ImportSource, path: string): DiscoveredSkill | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u.exec(text)
  const front = match?.[1] ?? ''
  const body = (match?.[2] ?? text).trim()
  const fields = parseFrontmatter(front)
  const fromFile = kebabName(path.endsWith('SKILL.md') ? basename(dirname(path)) : basename(path))
  const name = kebabName(String(fields.name ?? '')) ?? fromFile
  if (name === undefined) return undefined
  const description = String(fields.description ?? firstHeading(body) ?? name)
  return {
    source,
    name,
    description,
    path,
    content: body.length === 0 ? text : body,
  }
}

/** Keep existing frontmatter or wrap a body so DSH can load it. */
export function ensureFrontmatter(skill: DiscoveredSkill): string {
  if (skill.content.startsWith('---')) {
    return skill.content.endsWith('\n') ? skill.content : `${skill.content}\n`
  }
  return [
    '---',
    `name: ${skill.name}`,
    `description: ${JSON.stringify(skill.description)}`,
    '---',
    '',
    skill.content.trim(),
    '',
  ].join('\n')
}

/** Minimal YAML map parser for skill frontmatter. */
function parseFrontmatter(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const line of text.split(/\r?\n/u)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/u.exec(line)
    if (match === null) continue
    const key = match[1]
    let value = (match[2] ?? '').trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key !== undefined) fields[key] = value
  }
  return fields
}

/** First Markdown heading, used when a skill has no description. */
function firstHeading(body: string): string | undefined {
  const match = /^#\s+(.+)$/mu.exec(body)
  return match?.[1]?.trim()
}
