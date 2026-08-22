/**
 * Pure title-policy helpers. Free of cordis so the unit script can import
 * them under plain Node.
 * @module @starpivot/dsh-session-title/logic
 */

/** Settings namespace owned by this plugin (host schema + browser bind). */
export const SETTINGS_NAMESPACE = 'session-title'

/** Field carrying the title system prompt. */
export const PROMPT_FIELD = 'prompt'

/** Field carrying follow vs custom model mode. */
export const MODEL_MODE_FIELD = 'modelMode'

/** Field carrying a custom provider id. */
export const PROVIDER_FIELD = 'provider'

/** Field carrying a custom model id. */
export const MODEL_FIELD = 'model'

/** Accepted model modes. */
export const MODEL_MODES = ['follow', 'custom']

/** Default: inherit the conversation's logged request route. */
export const DEFAULT_MODEL_MODE = 'follow'

/**
 * OpenCode `agent.title.prompt` verbatim. Empty / whitespace settings keep
 * the DSH built-in English instruction instead of this string.
 */
export const DEFAULT_PROMPT = '你只负责为会话生成标题。严格输出一行中文标题，不要解释，不要加引号，不要输出多行。目标风格：清晰、短、像工单标题，使用方括号标签突出上下文。标题格式必须为：[领域/对象][行为] 具体事项。规则：1) 第一标签写最能帮助识别上下文的领域或对象，优先使用用户明确提到的系统、产品、仓库、模块或业务域；否则从工作目录或任务内容推断，如 服务器、OpenCode、前端、后端、数据库、GitHub、文档、部署、网络、图片、论文。界面已经显示路径时，不要把 ~/CODE、root、CODE 这类泛路径当标题主体。2) 第二标签写行为，只能选一个最匹配词：调研、排查、修复、开发、优化、重构、配置、审查、整理、生成、同步、发布。3) 具体事项用 4-12 个中文字符概括核心对象和动作，必须具体可识别。禁止空泛词：代码开发、功能实现、项目优化、通用开发、问题处理、任务处理。要求：总长度 10-26 字符；不出现 新会话、标题、对话、会话 等词；不照抄原始提示词；不使用 emoji；除两个方括号标签外不要堆标点。示例：[服务器][调研] 宕机原因排查；[OpenCode][配置] 标题生成风格；[前端][修复] 移动端布局错位；[数据库][优化] 查询慢表索引；[GitHub][发布] PR创建流程。'

/** Plugin id used as the cordis patch-row id. */
export const PLUGIN_ID = 'session-title'

/** Package name: must match package.json, client module id, and patch row. */
export const PACKAGE_NAME = '@starpivot/dsh-session-title'

/**
 * Coerce a stored prompt to a trimmed string. Whitespace-only becomes empty.
 * @param {unknown} value raw preference
 * @returns {string}
 */
export function normalizePrompt(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Coerce a stored or resolved value to a known model mode.
 * @param {unknown} value raw preference
 * @returns {'follow' | 'custom'}
 */
export function normalizeModelMode(value) {
  return value === 'custom' ? 'custom' : 'follow'
}

/**
 * Coerce a stored provider or model id. Whitespace-only becomes empty.
 * @param {unknown} value raw preference
 * @returns {string}
 */
export function normalizeRoutePart(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Decide the dispatched title system prompt and route.
 * Does not mutate `original`.
 *
 * @param {object} input
 * @param {unknown} input.prompt stored prompt
 * @param {unknown} input.modelMode stored mode
 * @param {unknown} input.provider stored custom provider
 * @param {unknown} input.model stored custom model
 * @param {readonly string[]} input.availableProviders currently registered provider ids
 * @param {{system?: string, provider: string, model: string}} input.original frozen request route
 * @returns {{system?: string, provider?: string, model?: string, fallback?: 'missing-provider'}}
 */
export function resolveTitlePolicy({
  prompt,
  modelMode,
  provider,
  model,
  availableProviders,
  original,
}) {
  const system = normalizePrompt(prompt)
  const mode = normalizeModelMode(modelMode)
  const customProvider = normalizeRoutePart(provider)
  const customModel = normalizeRoutePart(model)
  const listed = Array.isArray(availableProviders) ? availableProviders : []

  /** @type {{system?: string, provider?: string, model?: string, fallback?: 'missing-provider'}} */
  const result = {}
  if (system.length > 0) result.system = system

  if (mode === 'custom' && customProvider.length > 0 && customModel.length > 0) {
    if (listed.includes(customProvider)) {
      result.provider = customProvider
      result.model = customModel
    } else {
      result.fallback = 'missing-provider'
    }
  }

  return result
}

/**
 * Whether the policy requires cloning a new GenerateOptions envelope.
 * @param {{system?: string, provider?: string, model?: string}} policy
 * @returns {boolean}
 */
export function policyChangesRequest(policy) {
  return policy.system !== undefined
    || policy.provider !== undefined
    || policy.model !== undefined
}
