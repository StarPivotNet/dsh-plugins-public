window.__ModuleLoader__.load({
  id: "@starpivot/dsh-session-title",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    // Session-title settings page. Persisted in the Host user-settings
    // section "session-title". The host half intercepts purpose=session-title
    // LLM calls and applies the live prompt / optional custom route.
    const react = require("react");
    const { createSnapshotStore } = require("@deepseek-ai/dsh-client-runtime/client");
    const { Button, Menu, IconChevronDownOutline14 } = require("@deepseek-ai/dsh-client-ui-primitives");

    const NS = "session-title";
    const PROMPT_FIELD = "prompt";
    const MODEL_MODE_FIELD = "modelMode";
    const PROVIDER_FIELD = "provider";
    const MODEL_FIELD = "model";
    const FOLLOW_ID = "follow";
    const DEFAULT_MODEL_MODE = "follow";
    const DEFAULT_PROMPT = "你只负责为会话生成标题。严格输出一行中文标题，不要解释，不要加引号，不要输出多行。目标风格：清晰、短、像工单标题，使用方括号标签突出上下文。标题格式必须为：[领域/对象][行为] 具体事项。规则：1) 第一标签写最能帮助识别上下文的领域或对象，优先使用用户明确提到的系统、产品、仓库、模块或业务域；否则从工作目录或任务内容推断，如 服务器、OpenCode、前端、后端、数据库、GitHub、文档、部署、网络、图片、论文。界面已经显示路径时，不要把 ~/CODE、root、CODE 这类泛路径当标题主体。2) 第二标签写行为，只能选一个最匹配词：调研、排查、修复、开发、优化、重构、配置、审查、整理、生成、同步、发布。3) 具体事项用 4-12 个中文字符概括核心对象和动作，必须具体可识别。禁止空泛词：代码开发、功能实现、项目优化、通用开发、问题处理、任务处理。要求：总长度 10-26 字符；不出现 新会话、标题、对话、会话 等词；不照抄原始提示词；不使用 emoji；除两个方括号标签外不要堆标点。示例：[服务器][调研] 宕机原因排查；[OpenCode][配置] 标题生成风格；[前端][修复] 移动端布局错位；[数据库][优化] 查询慢表索引；[GitHub][发布] PR创建流程。";
    const PROMPT_DEBOUNCE_MS = 400;

    const zh = {
      nav: "会话标题",
      title: "会话标题",
      intro: "第一条合格用户消息后自动取名。之后不会重取；侧栏手改过的标题会钉住。清空提示词则使用 DSH 自带英文短指令。",
      promptLabel: "取名提示词",
      promptHint: "发给取名模型的系统提示词。失焦或停顿后自动保存。",
      restore: "恢复默认",
      modelLabel: "取名模型",
      modelHint: "默认跟随当前对话路线。也可锁定已装模型；路线不可用时回退到对话路线。",
      follow: "跟随对话",
      catalogError: "无法加载模型目录，仍可跟随对话。",
    };
    const en = {
      nav: "Session title",
      title: "Session title",
      intro: "The first eligible user message is titled automatically. Later messages do not retitle; a sidebar rename pins the title. An empty prompt keeps the built-in English instruction.",
      promptLabel: "Title prompt",
      promptHint: "System instruction sent to the title model. Saved on blur and after a short pause.",
      restore: "Restore default",
      modelLabel: "Title model",
      modelHint: "Follows the conversation route by default. Pin an installed model; an unavailable route falls back to the conversation.",
      follow: "Follow conversation",
      catalogError: "Could not load the model catalog. Follow conversation remains available.",
    };

    function catalogFrom(groups) {
      if (!Array.isArray(groups)) return [];
      const rows = [];
      for (const group of groups) {
        if (group == null || typeof group.id !== "string") continue;
        const models = Array.isArray(group.models) ? group.models : [];
        for (const model of models) {
          if (model == null || typeof model.id !== "string") continue;
          rows.push({
            provider: group.id,
            providerName: typeof group.name === "string" ? group.name : group.id,
            model: model.id,
            modelName: typeof model.name === "string" ? model.name : model.id,
          });
        }
      }
      return rows;
    }

    function routeId(provider, model) {
      return `${provider}\u0000${model}`;
    }

    class TitlePolicy {
      constructor(host, api) {
        this.host = host;
        this.api = api;
        this.prompt = createSnapshotStore(DEFAULT_PROMPT);
        this.modelMode = createSnapshotStore(DEFAULT_MODEL_MODE);
        this.provider = createSnapshotStore("");
        this.model = createSnapshotStore("");
        this.catalog = createSnapshotStore([]);
        this.catalogError = createSnapshotStore(null);
        this.timer = undefined;
        if (host !== undefined) {
          host.subscribe(() => { this.adopt(host) });
          this.adopt(host);
        }
      }

      dispose() {
        if (this.timer !== undefined) {
          clearTimeout(this.timer);
          this.timer = undefined;
        }
      }

      adopt(host) {
        const section = host.getSnapshot().value;
        if (section === undefined) return;
        if (typeof section.prompt === "string" && this.prompt.getSnapshot() !== section.prompt) {
          this.prompt.set(section.prompt);
        }
        const mode = section.modelMode === "custom" ? "custom" : "follow";
        if (this.modelMode.getSnapshot() !== mode) this.modelMode.set(mode);
        const provider = typeof section.provider === "string" ? section.provider : "";
        const model = typeof section.model === "string" ? section.model : "";
        if (this.provider.getSnapshot() !== provider) this.provider.set(provider);
        if (this.model.getSnapshot() !== model) this.model.set(model);
      }

      setPrompt(value) {
        if (this.prompt.getSnapshot() === value) return;
        this.prompt.set(value);
        this.schedulePrompt(value);
      }

      flushPrompt() {
        if (this.timer !== undefined) {
          clearTimeout(this.timer);
          this.timer = undefined;
        }
        void this.host?.set(PROMPT_FIELD, this.prompt.getSnapshot());
      }

      schedulePrompt(value) {
        if (this.timer !== undefined) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.timer = undefined;
          void this.host?.set(PROMPT_FIELD, value);
        }, PROMPT_DEBOUNCE_MS);
      }

      restorePrompt() {
        if (this.prompt.getSnapshot() === DEFAULT_PROMPT) return;
        this.prompt.set(DEFAULT_PROMPT);
        if (this.timer !== undefined) {
          clearTimeout(this.timer);
          this.timer = undefined;
        }
        void this.host?.set(PROMPT_FIELD, DEFAULT_PROMPT);
      }

      setFollow() {
        if (this.modelMode.getSnapshot() !== "follow") this.modelMode.set("follow");
        void this.host?.set(MODEL_MODE_FIELD, "follow");
      }

      setCustom(provider, model) {
        if (this.modelMode.getSnapshot() !== "custom") this.modelMode.set("custom");
        if (this.provider.getSnapshot() !== provider) this.provider.set(provider);
        if (this.model.getSnapshot() !== model) this.model.set(model);
        void this.host?.set(MODEL_MODE_FIELD, "custom");
        void this.host?.set(PROVIDER_FIELD, provider);
        void this.host?.set(MODEL_FIELD, model);
      }

      async loadCatalog() {
        if (this.api?.llm?.models === undefined) {
          this.catalogError.set("unavailable");
          return;
        }
        try {
          const response = await this.api.llm.models({});
          if (!response?.result?.ok) {
            this.catalog.set([]);
            this.catalogError.set(response?.result?.error?.message ?? "failed");
            return;
          }
          this.catalog.set(catalogFrom(response.result.value.groups));
          this.catalogError.set(null);
        } catch (error) {
          this.catalog.set([]);
          this.catalogError.set(error instanceof Error ? error.message : "failed");
        }
      }
    }

    const styles = {
      section: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 720,
        color: "var(--dsw-alias-label-primary)",
      },
      title: {
        margin: 0,
        fontSize: 18,
        fontWeight: 600,
      },
      intro: {
        margin: 0,
        fontSize: 13,
        color: "var(--dsw-alias-label-tertiary)",
      },
      group: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
      },
      field: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
      },
      fieldHead: {
        display: "flex",
        alignItems: "center",
        gap: 8,
      },
      fieldLabel: {
        fontSize: 12,
        fontWeight: 500,
        color: "var(--dsw-alias-label-secondary)",
      },
      hint: {
        margin: 0,
        fontSize: 12,
        lineHeight: "18px",
        color: "var(--dsw-alias-label-tertiary)",
      },
      textarea: {
        boxSizing: "border-box",
        width: "100%",
        minHeight: 160,
        resize: "vertical",
        padding: "9px 12px",
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 10,
        font: "inherit",
        fontSize: 13,
        lineHeight: 1.5,
        background: "var(--dsw-alias-bg-layer-1)",
        color: "var(--dsw-alias-label-primary)",
      },
      selector: {
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        alignSelf: "flex-start",
        height: 36,
        padding: "0 14px",
        border: "none",
        borderRadius: 18,
        background: "var(--dsw-alias-bg-module-platform)",
        font: "inherit",
        fontSize: 14,
        lineHeight: "22px",
        color: "var(--dsw-alias-label-primary)",
        cursor: "pointer",
      },
      chevron: { flex: "none" },
      error: {
        margin: 0,
        fontSize: 12,
        color: "var(--dsw-alias-state-error-primary)",
      },
    };

    function TitleSection({
      usePrompt,
      useModelMode,
      useProvider,
      useModel,
      useCatalog,
      useCatalogError,
      setPrompt,
      flushPrompt,
      restorePrompt,
      setFollow,
      setCustom,
      loadCatalog,
      t,
    }) {
      const prompt = usePrompt((value) => value);
      const modelMode = useModelMode((value) => value);
      const provider = useProvider((value) => value);
      const model = useModel((value) => value);
      const catalog = useCatalog((value) => value);
      const catalogError = useCatalogError((value) => value);
      const [open, setOpen] = react.useState(false);
      const [focused, setFocused] = react.useState(false);

      react.useEffect(() => {
        void loadCatalog();
      }, [loadCatalog]);

      const selectedId = modelMode === "custom" && provider.length > 0 && model.length > 0
        ? routeId(provider, model)
        : FOLLOW_ID;
      const selectedRow = catalog.find((row) => routeId(row.provider, row.model) === selectedId);
      const selectedLabel = selectedId === FOLLOW_ID
        ? t("follow")
        : selectedRow === undefined
          ? `${provider}/${model}`
          : `${selectedRow.modelName} (${selectedRow.providerName})`;

      const items = [{ id: FOLLOW_ID, label: t("follow") }];
      let lastProvider;
      for (const row of catalog) {
        if (row.provider !== lastProvider) {
          items.push({ type: "label", id: `provider:${row.provider}`, text: row.providerName });
          lastProvider = row.provider;
        }
        items.push({ id: routeId(row.provider, row.model), label: row.modelName });
      }

      return react.createElement(
        "div",
        { style: styles.section },
        react.createElement("h2", { style: styles.title }, t("title")),
        react.createElement("p", { style: styles.intro }, t("intro")),
        react.createElement(
          "section",
          { style: styles.group },
          react.createElement(
            "div",
            { style: styles.field },
            react.createElement(
              "div",
              { style: styles.fieldHead },
              react.createElement("span", { style: styles.fieldLabel }, t("promptLabel")),
              react.createElement(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  disabled: prompt === DEFAULT_PROMPT,
                  onClick: () => { restorePrompt() },
                },
                t("restore"),
              ),
            ),
            react.createElement("p", { style: styles.hint }, t("promptHint")),
            react.createElement("textarea", {
              style: {
                ...styles.textarea,
                outline: "none",
                borderColor: focused ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-border-l2)",
              },
              value: prompt,
              spellCheck: false,
              onFocus: () => { setFocused(true) },
              onChange: (event) => { setPrompt(event.target.value) },
              onBlur: () => { setFocused(false); flushPrompt() },
            }),
          ),
        ),
        react.createElement(
          "section",
          { style: styles.group },
          react.createElement("span", { style: styles.fieldLabel }, t("modelLabel")),
          react.createElement("p", { style: styles.hint }, t("modelHint")),
          catalogError === null
            ? null
            : react.createElement("p", { style: styles.error, role: "alert" }, t("catalogError")),
          react.createElement(Menu, {
            open,
            onClose: () => { setOpen(false) },
            items,
            selectedId,
            onSelect: (id) => {
              setOpen(false);
              if (id === FOLLOW_ID) {
                setFollow();
                return;
              }
              const row = catalog.find((item) => routeId(item.provider, item.model) === id);
              if (row === undefined) return;
              setCustom(row.provider, row.model);
            },
            align: "start",
            portal: true,
            anchor: react.createElement(
              "button",
              {
                type: "button",
                style: styles.selector,
                "aria-haspopup": "menu",
                "aria-expanded": open,
                onClick: () => { setOpen((value) => !value) },
              },
              selectedLabel,
              react.createElement(IconChevronDownOutline14, { style: styles.chevron }),
            ),
          }),
        ),
      );
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "session-title: dictionaries");
      const connection = ctx.get("connection");
      const policy = new TitlePolicy(ctx.settingsScope.bind({ namespace: NS }), connection?.api);
      ctx.effect(() => () => { policy.dispose() }, "session-title: prompt debounce");
      const t = ctx.locale.bind(NS);
      const loadCatalog = () => policy.loadCatalog();
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "session-title",
        order: 22,
        label: () => t("nav"),
        locale: NS,
        inject: () => ({
          hooks: {
            prompt: policy.prompt,
            modelMode: policy.modelMode,
            provider: policy.provider,
            model: policy.model,
            catalog: policy.catalog,
            catalogError: policy.catalogError,
          },
          setPrompt: (value) => { policy.setPrompt(value) },
          flushPrompt: () => { policy.flushPrompt() },
          restorePrompt: () => { policy.restorePrompt() },
          setFollow: () => { policy.setFollow() },
          setCustom: (provider, model) => { policy.setCustom(provider, model) },
          loadCatalog,
        }),
      }, TitleSection));
    }

    exports.apply = apply;
    exports.inject = ["slots", "locale", "connection", "remote", "settingsScope"];
    return module.exports;
  },
});
