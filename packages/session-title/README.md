# @starpivot/dsh-session-title

Settings → **Session title**: change the auto-title system prompt at any time, and optionally pin the title model.

The default prompt is a ticket-style Chinese instruction. An empty prompt keeps the DSH built-in English short instruction. Restore default writes only that prompt; it does not change the model choice.

## Behavior

- Timing is still one title after the first eligible user message (human or Host Automation). Later messages do not retitle; a sidebar rename pins the title.
- The title model follows the current conversation route by default. The settings page can pin an installed model.
- If the pinned route is unavailable: fall back to the conversation route and warn on the host.
- The host intercepts LLM calls with `purpose: 'session-title'`. Frozen `GenerateOptions` are cloned before dispatch; the original object is not mutated.
- `session/title-llm-request` may still record the helper's original system/route; the dispatched envelope is the clone.

## Install

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/session-title
# or
dsh plugin --profile web add @starpivot/dsh-session-title
```

Then restart `dsh web`. Refresh the page to see the settings section.

## Verify

```sh
node scripts/policy.test.mjs
```
