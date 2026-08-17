/** Shared session-import types used by converters and the Host plugin. */

/** Supported foreign conversation stores. */
export type ImportSource = 'claude' | 'codex' | 'cursor'

/** One model-facing content block in a converted DSH event. */
export type ImportContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'reasoning'; readonly text: string }
  | { readonly type: 'tool-call'; readonly id: string; readonly name: string; readonly arguments: string }
  | {
    readonly type: 'tool-result'
    readonly toolCallId: string
    readonly content: readonly ImportContentBlock[]
    readonly isError?: boolean
  }

/** One conversation item extracted from a foreign transcript. */
export type TranscriptItem =
  | {
    readonly kind: 'user'
    readonly id?: string
    readonly time: number
    readonly text: string
    readonly source: 'user' | 'plugin'
    readonly plugin?: string
    readonly form?: 'instructions' | 'notice' | 'recall'
  }
  | {
    readonly kind: 'assistant'
    readonly id?: string
    readonly time: number
    readonly text: string
    readonly reasoning: string
    readonly model?: string
    readonly provider?: string
    readonly toolCalls: readonly TranscriptToolCall[]
  }
  | {
    readonly kind: 'tool-result'
    readonly time: number
    readonly callId: string
    readonly text: string
    readonly isError: boolean
  }

/** One foreign tool invocation. */
export interface TranscriptToolCall {
  readonly callId: string
  readonly name: string
  readonly arguments: string
}

/** Converter-owned conversation ready to become a DSH seed. */
export interface TranscriptConversation {
  readonly source: ImportSource
  readonly nativeId: string
  readonly title?: string
  readonly cwd?: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly model?: string
  readonly provider?: string
  readonly items: readonly TranscriptItem[]
}

/** One DSH session event written by the importer. */
export interface ImportSessionEvent {
  readonly type: string
  readonly seq: number
  readonly time: number
  readonly data: unknown
  readonly surfaceOp?: 'append'
  readonly ignorable?: true
}

/** DSH session header written beside the imported event seed. */
export interface ImportSessionHeader {
  readonly version: 0
  readonly id: string
  readonly createdAt: number
  readonly cwd?: string
  readonly seedLength: number
  readonly delegationDepth: 0
}

/** Result of converting one foreign conversation. */
export interface ConvertedSession {
  readonly source: ImportSource
  readonly nativeId: string
  readonly path: string
  readonly title: string
  readonly header: ImportSessionHeader
  readonly events: readonly ImportSessionEvent[]
  readonly skipped: number
}

/** One skill file discovered next to a foreign agent home. */
export interface DiscoveredSkill {
  readonly source: ImportSource
  readonly name: string
  readonly description: string
  readonly path: string
  readonly content: string
}

/** One foreign conversation found on disk, before conversion. */
export interface DiscoveredSession {
  readonly source: ImportSource
  readonly nativeId: string
  readonly path: string
  readonly title: string
  readonly cwd?: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly bytes: number
}

/** Limits applied while converting foreign transcripts. */
export interface ConvertLimits {
  readonly maxToolResultChars: number
  readonly maxTextChars: number
}

/** Default conversion limits. */
export const DEFAULT_CONVERT_LIMITS: ConvertLimits = {
  maxToolResultChars: 32_000,
  maxTextChars: 200_000,
}

/** Stable imported session id for one foreign conversation. */
export function importedSessionId(source: ImportSource, nativeId: string): string {
  const safe = nativeId.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return `import-${source}-${safe || 'session'}`
}
