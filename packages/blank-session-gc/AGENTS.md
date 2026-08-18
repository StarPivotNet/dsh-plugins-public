# AGENTS.md

Org share copy of blank-session-gc: `@starpivot/dsh-blank-session-gc`.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/blank-session-gc`, then restart `dsh web`.

## Architecture

Host daemon. Watches `session/created`, keeps the newest unused blank, deletes the rest from workspace accounts and JSONL directories.

## Commands

```sh
node scripts/pick-victims.test.mjs
```

## Gotchas

- Do not change `source.entries` of other plugins; this package has no catalog rewrite.
- Persistence has no public delete API; removing the located JSONL directory is the durable erase.
