# AGENTS.md

Org share copy of skill-router: `@starpivot/dsh-skill-router`.

## Gotchas

- `Config` must be a schemastery schema object (`z.object(...)`), not a plain function.
- Rewrite only `content[].text`, never `source.entries`.
- Package name and `cordis.patch.yml` mount `name` must stay `@starpivot/dsh-skill-router`.
