window.__ModuleLoader__.load({
  id: "@starpivot/dsh-enter-newline",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    // Composer Enter behavior with a settings toggle. Modes (persisted in the
    // Host user-settings section "ui-enter-newline", selectable in General
    // Settings as the "回车行为" row):
    //   "send"    — product default: Enter sends, Shift+Enter newlines.
    //   "newline" — Enter inserts a newline, Shift+Enter sends; Cmd/Ctrl+Enter
    //               keeps the product's accelerated gesture.
    // The interceptor runs in the capture phase at the document level, so it
    // sees the keydown before React's root listener. In "newline" mode it
    // preventDefault + stopPropagation the product's Enter→submit path and
    // writes the newline back through the native value setter plus an `input`
    // event so the draft machine records it exactly like Shift+Enter would.
    // Shift+Enter replays a plain Enter keydown so the product's own submit
    // path (menu arbitration, queue/steer policy, IME guard) runs unchanged.
    const react = require("react");
    const { createSnapshotStore } = require("@deepseek-ai/dsh-client-runtime/client");
    const { Menu, IconChevronDownOutline14 } = require("@deepseek-ai/dsh-client-ui-primitives");

    const NS = "enter-newline";
    const ENTER_BEHAVIOR_FIELD = "enterBehavior";
    const ENTER_BEHAVIORS = ["send", "newline"];
    const DEFAULT_ENTER_BEHAVIOR = "send";

    const zh = {
      "settings.enterNewline.title": "回车行为",
      "settings.enterNewline.description": "选择按回车时是发送消息还是换行；切换后 Shift+回车使用相反行为",
      "settings.enterNewline.send": "回车发送",
      "settings.enterNewline.newline": "回车换行",
    };
    const en = {
      "settings.enterNewline.title": "Enter behavior",
      "settings.enterNewline.description": "Choose whether Enter sends the message or inserts a newline; Shift+Enter uses the opposite",
      "settings.enterNewline.send": "Enter to send",
      "settings.enterNewline.newline": "Enter for newline",
    };

    // Live preference shared by the Settings row and the interceptor; durable
    // writes go through the bound settings scope (absent scope = process-local).
    class EnterBehaviorPolicy {
      constructor(host) {
        this.enterBehavior = createSnapshotStore(DEFAULT_ENTER_BEHAVIOR);
        this.host = host;
        if (host !== undefined) {
          host.subscribe(() => { this.adopt(host) });
          this.adopt(host);
        }
      }

      setEnterBehavior(mode) {
        if (this.enterBehavior.getSnapshot() === mode) return
        this.enterBehavior.set(mode)
        void this.host?.set(ENTER_BEHAVIOR_FIELD, mode)
      }

      adopt(host) {
        const section = host.getSnapshot().value
        if (section === undefined || this.enterBehavior.getSnapshot() === section.enterBehavior) return
        this.enterBehavior.set(section.enterBehavior)
      }
    }

    // Settings row (General Settings → settings.general.item). Inline styles
    // mirror EnterBehaviorRow.module.css; CSS modules are unavailable in this
    // hand-built bundle.
    const rowStyles = {
      row: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "16px 0",
        borderBottom: "1px solid var(--dsw-alias-border-l2)",
      },
      rowText: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        paddingRight: 48,
      },
      title: {
        fontSize: 14,
        fontWeight: 400,
        lineHeight: "22px",
        color: "var(--dsw-alias-label-primary)",
      },
      desc: {
        fontSize: 12,
        fontWeight: 400,
        lineHeight: "18px",
        color: "var(--dsw-alias-label-tertiary)",
      },
      selector: {
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
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
    };

    function EnterBehaviorRow({ useEnterBehavior, setEnterBehavior, t }) {
      const behavior = useEnterBehavior((value) => value)
      const [open, setOpen] = react.useState(false)
      const labelKey = behavior === "newline" ? "settings.enterNewline.newline" : "settings.enterNewline.send"
      return react.createElement(
        "div", { style: rowStyles.row },
        react.createElement(
          "div", { style: rowStyles.rowText },
          react.createElement("div", { style: rowStyles.title }, t("settings.enterNewline.title")),
          react.createElement("div", { style: rowStyles.desc }, t("settings.enterNewline.description")),
        ),
        react.createElement(Menu, {
          open,
          onClose: () => { setOpen(false) },
          items: ENTER_BEHAVIORS.map((id) => ({
            id,
            label: t(id === "newline" ? "settings.enterNewline.newline" : "settings.enterNewline.send"),
          })),
          selectedId: behavior,
          onSelect: (id) => { setOpen(false); setEnterBehavior(id) },
          align: "end",
          portal: true,
          anchor: react.createElement(
            "button",
            {
              type: "button",
              style: rowStyles.selector,
              "aria-haspopup": "menu",
              "aria-expanded": open,
              onClick: () => { setOpen((value) => !value) },
            },
            t(labelKey),
            react.createElement(IconChevronDownOutline14, { style: rowStyles.chevron }),
          ),
        }),
      )
    }

    function installInterceptor(policy) {
      let synthesizing = false
      const onKeyDown = (event) => {
        if (policy.enterBehavior.getSnapshot() !== "newline") return
        if (event.key !== "Enter") return
        if (event.ctrlKey || event.metaKey || event.altKey) return
        if (event.isComposing || event.keyCode === 229) return
        const target = event.target
        if (!(target instanceof HTMLTextAreaElement)) return
        if (target.readOnly) return
        if (target.closest("[data-composer-card]") === null) return
        if (target.hasAttribute("aria-activedescendant")) return
        if (synthesizing) return
        if (event.shiftKey) {
          // Shift+Enter sends in newline mode: block the native newline and
          // replay a plain Enter so the product's submit path runs unchanged.
          event.preventDefault()
          event.stopPropagation()
          synthesizing = true
          try {
            target.dispatchEvent(new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            }))
          } finally {
            synthesizing = false
          }
          return
        }
        event.preventDefault()
        event.stopPropagation()
        const start = target.selectionStart ?? target.value.length
        const end = target.selectionEnd ?? start
        const next = target.value.slice(0, start) + "\n" + target.value.slice(end)
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set
        nativeSetter.call(target, next)
        target.setSelectionRange(start + 1, start + 1)
        target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertLineBreak", data: "\n" }))
      }
      document.addEventListener("keydown", onKeyDown, true)
      return () => {
        document.removeEventListener("keydown", onKeyDown, true)
      }
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-enter-newline: dictionaries")
      const policy = new EnterBehaviorPolicy(ctx.settingsScope.bind({ namespace: NS }))
      ctx.slots.inject("settings.general.item", () => ctx.slots.register({
        name: "settings.general.item",
        id: "composer-enter-newline",
        order: 30,
        locale: NS,
        inject: () => ({
          hooks: { enterBehavior: policy.enterBehavior },
          setEnterBehavior: (mode) => { policy.setEnterBehavior(mode) },
        }),
      }, EnterBehaviorRow))
      ctx.effect(() => installInterceptor(policy), "enter-newline interceptor")
    }

    exports.apply = apply;
    exports.inject = ["slots", "locale", "connection", "remote", "settingsScope"];
    return module.exports;
  }
});
