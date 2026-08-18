/** Build a balanced DSH session seed from a foreign transcript. */

import { epochMs, flattenText, fallbackTitle, truncateChars } from './text.ts'
import type {
  ConvertedSession,
  ConvertLimits,
  ImportSessionEvent,
  ImportSessionHeader,
  ImportSource,
  TranscriptConversation,
  TranscriptItem,
} from './types.ts'
import { DEFAULT_CONVERT_LIMITS, importedSessionId } from './types.ts'

const SESSION_FORMAT_VERSION = 0

/** Convert one extracted conversation into a DSH seed. */
export function convertConversation(
  conversation: TranscriptConversation,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): ConvertedSession {
  const id = importedSessionId(conversation.source, conversation.nativeId)
  const events: ImportSessionEvent[] = []
  let seq = 0
  let turn = 0
  let openStep: number | null = null
  let nextStep = 1
  let skipped = 0
  const pending = new Map<string, { turn: number; step: number }>()

  const push = (type: string, data: unknown, time: number, surface?: true): void => {
    events.push({
      type,
      seq: seq++,
      time,
      data,
      ...surface === true ? { surfaceOp: 'append' as const } : {},
    })
  }

  const closeStep = (time: number): void => {
    if (openStep === null || turn === 0) return
    for (const [callId, open] of [...pending]) {
      if (open.turn !== turn || open.step !== openStep) continue
      push('tool/result', toolResultEvent(open.turn, open.step, callId, '(imported call had no recorded result)', true, limits), time, true)
      pending.delete(callId)
    }
    push('step/end', { turn, step: openStep }, time)
    openStep = null
    nextStep += 1
  }

  const closeTurn = (time: number): void => {
    closeStep(time)
    if (turn === 0) return
    pending.clear()
    push('turn/end', { turn, reason: { kind: 'completed' } }, time)
  }

  const ensureTurn = (time: number): void => {
    if (turn !== 0) return
    turn = 1
    nextStep = 1
    push('turn/start', { turn }, time)
  }

  const ensureStep = (time: number): number => {
    ensureTurn(time)
    if (openStep === null) {
      openStep = nextStep
      push('step/start', { turn, step: openStep }, time)
    }
    return openStep
  }

  for (const item of conversation.items) {
    if (item.kind === 'user') {
      const text = flattenText(item.text, limits)
      if (text.length === 0) {
        skipped += 1
        continue
      }
      closeTurn(item.time)
      turn += 1
      nextStep = 1
      push('turn/start', { turn }, item.time)
      push('user/message', {
        id: item.id ?? messageId(conversation.source, conversation.nativeId, seq),
        role: 'user',
        content: [{ type: 'text', text }],
        source: item.source === 'plugin'
          ? { kind: 'plugin', plugin: item.plugin ?? conversation.source, ...item.form === undefined ? {} : { form: item.form } }
          : { kind: 'user' },
      }, item.time, true)
      continue
    }

    if (item.kind === 'assistant') {
      const step = ensureStep(item.time)
      const content: Array<Record<string, unknown>> = []
      const reasoning = flattenText(item.reasoning, limits)
      if (reasoning.length > 0) content.push({ type: 'reasoning', text: reasoning })
      const text = flattenText(item.text, limits)
      if (text.length > 0) content.push({ type: 'text', text })
      for (const call of item.toolCalls) {
        content.push({
          type: 'tool-call',
          id: call.callId,
          name: call.name,
          arguments: call.arguments,
        })
        push('tool/call', {
          turn,
          step,
          callId: call.callId,
          name: call.name,
          arguments: call.arguments,
        }, item.time)
        pending.set(call.callId, { turn, step })
      }
      if (content.length === 0) content.push({ type: 'text', text: '' })
      push('assistant/message', {
        turn,
        step,
        message: {
          id: item.id ?? messageId(conversation.source, conversation.nativeId, seq),
          role: 'assistant',
          content,
          source: {
            kind: 'model',
            provider: item.provider ?? conversation.provider ?? conversation.source,
            model: item.model ?? conversation.model ?? conversation.source,
          },
        },
      }, item.time, true)
      if (pending.size === 0) closeStep(item.time)
      continue
    }

    const open = pending.get(item.callId)
    if (open === undefined) {
      skipped += 1
      continue
    }
    pending.delete(item.callId)
    push('tool/result', toolResultEvent(open.turn, open.step, item.callId, item.text, item.isError, limits), item.time, true)
    const remaining = [...pending.values()].some(entry => entry.turn === open.turn && entry.step === open.step)
    if (!remaining) closeStep(item.time)
  }

  const lastTime = epochMs(conversation.items.at(-1)?.time ?? conversation.updatedAt)
  closeTurn(lastTime)

  const firstUser = conversation.items.find((item): item is Extract<TranscriptItem, { kind: 'user' }> => (
    item.kind === 'user'
    && item.source === 'user'
    && item.text.trim().length > 0
    && !item.text.trimStart().startsWith('# AGENTS.md')
    && !item.text.trimStart().startsWith('# Files mentioned')
  ))
  const title = conversation.title?.trim() || (firstUser === undefined ? 'Imported session' : fallbackTitle(firstUser.text))
  const firstUserEvent = events.find(event => event.type === 'user/message')
  if (title.length > 0) {
    push('session/title', {
      title,
      messageSeqs: firstUserEvent === undefined ? [] : [firstUserEvent.seq],
      source: firstUserEvent === undefined ? { kind: 'user' } : { kind: 'fallback' },
    }, lastTime)
  }

  const importedAt = Date.now()
  const header: ImportSessionHeader = {
    version: SESSION_FORMAT_VERSION,
    id,
    createdAt: importedAt,
    ...isAbsolutePath(conversation.cwd) ? { cwd: conversation.cwd } : {},
    seedLength: events.length,
    delegationDepth: 0,
  }
  return {
    source: conversation.source,
    nativeId: conversation.nativeId,
    path,
    title,
    header,
    events,
    skipped,
  }
}

/** Build one identified tool-result event payload. */
function toolResultEvent(
  turn: number,
  step: number,
  callId: string,
  text: string,
  isError: boolean,
  limits: ConvertLimits,
): Record<string, unknown> {
  const body = truncateChars(text, limits.maxToolResultChars)
  return {
    turn,
    step,
    message: {
      id: `import-tool-${callId}`,
      role: 'user',
      source: { kind: 'tool', callId },
      content: [{
        type: 'tool-result',
        toolCallId: callId,
        content: [{ type: 'text', text: body.length === 0 ? '(empty tool result)' : body }],
        isError,
      }],
    },
  }
}

/** Whether a foreign cwd is safe to stamp onto a DSH session header. */
function isAbsolutePath(value: string | undefined): value is string {
  return value !== undefined && (value.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(value))
}

/** Deterministic message id for one imported event. */
function messageId(source: ImportSource, nativeId: string, seq: number): string {
  return `import-${source}-${nativeId}-${String(seq)}`
}
