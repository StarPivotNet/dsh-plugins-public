import { parseCatalogDocument } from './catalog.ts'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

const parsed = parseCatalogDocument({
  version: 1,
  title: 'StarPivot',
  plugins: [{
    name: '@starpivot/dsh-plugin-marketplace',
    version: '0.1.12',
    title: 'Plugin marketplace',
    description: 'Replace the shipped Plugins settings page.',
    homepage: 'https://github.com/StarPivotNet/dsh-plugins-public',
    kind: 'bundle',
    updatedAt: '2026-08-16T17:52:31.074Z',
  }],
}, 'https://example.com/catalog.json')
assert(parsed.ok, 'valid listing with updatedAt')
if (parsed.ok) {
  assert(parsed.entries[0]?.updatedAt === '2026-08-16T17:52:31.074Z', 'keeps the publish time')
}

const omitted = parseCatalogDocument({
  version: 1,
  plugins: [{
    name: 'dsh-find-plugin',
    version: '0.3.6',
    title: 'Find plugins',
    description: '',
    kind: 'bundle',
  }],
}, 'https://example.com/catalog.json')
assert(omitted.ok, 'updatedAt stays optional')
if (omitted.ok) assert(omitted.entries[0]?.updatedAt === undefined, 'omitted stamp is absent')

const invalid = parseCatalogDocument({
  version: 1,
  plugins: [{
    name: 'dsh-find-plugin',
    version: '0.3.6',
    title: 'Find plugins',
    description: '',
    kind: 'bundle',
    updatedAt: 'yesterday',
  }],
}, 'https://example.com/catalog.json')
assert(!invalid.ok, 'rejects a non-ISO updatedAt')
if (!invalid.ok) assert(invalid.message.includes('updatedAt'), 'names the field')

console.log('catalog parse checks passed')
