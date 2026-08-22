window.__ModuleLoader__.load({
  id: "@starpivot/dsh-restart-continue",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    // Host-boot auto-continue preference. Persisted in the Host user-settings
    // section "restart-continue", selectable in General Settings as the
    // "重启后续跑" row:
    //   true  — product default: cold-resume interrupted roots on host boot.
    //   false — skip the boot sweep entirely.
    const react = require("react");
    const { createSnapshotStore } = require("@deepseek-ai/dsh-client-runtime/client");
    const { Menu, IconChevronDownOutline14 } = require("@deepseek-ai/dsh-client-ui-primitives");

    const NS = "restart-continue";
    const ENABLED_FIELD = "enabled";
    const ENABLED_MODES = ["on", "off"];
    const DEFAULT_ENABLED = true;

    const zh = {
      "settings.enabled.title": "重启后续跑",
      "settings.enabled.description": "dsh 重启后，自动把最近 24 小时内被打断的对话冷恢复并让模型继续",
      "settings.enabled.on": "自动续跑",
      "settings.enabled.off": "不自动续跑",
    };
    const en = {
      "settings.enabled.title": "Continue after restart",
      "settings.enabled.description": "After dsh restarts, automatically resume conversations interrupted in the last 24 hours",
      "settings.enabled.on": "Auto-continue",
      "settings.enabled.off": "Do not auto-continue",
    };

    class EnabledPolicy {
      constructor(host) {
        this.enabled = createSnapshotStore(DEFAULT_ENABLED);
        this.host = host;
        if (host !== undefined) {
          host.subscribe(() => { this.adopt(host) });
          this.adopt(host);
        }
      }

      setEnabled(value) {
        if (this.enabled.getSnapshot() === value) return
        this.enabled.set(value)
        void this.host?.set(ENABLED_FIELD, value)
      }

      adopt(host) {
        const section = host.getSnapshot().value
        if (section === undefined || this.enabled.getSnapshot() === section.enabled) return
        this.enabled.set(section.enabled)
      }
    }

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

    function EnabledRow({ useEnabled, setEnabled, t }) {
      const enabled = useEnabled((value) => value)
      const [open, setOpen] = react.useState(false)
      const labelKey = enabled ? "settings.enabled.on" : "settings.enabled.off"
      return react.createElement(
        "div", { style: rowStyles.row },
        react.createElement(
          "div", { style: rowStyles.rowText },
          react.createElement("div", { style: rowStyles.title }, t("settings.enabled.title")),
          react.createElement("div", { style: rowStyles.desc }, t("settings.enabled.description")),
        ),
        react.createElement(Menu, {
          open,
          onClose: () => { setOpen(false) },
          items: ENABLED_MODES.map((id) => ({
            id,
            label: t(id === "on" ? "settings.enabled.on" : "settings.enabled.off"),
          })),
          selectedId: enabled ? "on" : "off",
          onSelect: (id) => { setOpen(false); setEnabled(id === "on") },
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

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "restart-continue: dictionaries")
      const policy = new EnabledPolicy(ctx.settingsScope.bind({ namespace: NS }))
      ctx.slots.inject("settings.general.item", () => ctx.slots.register({
        name: "settings.general.item",
        id: "restart-continue-enabled",
        order: 33,
        locale: NS,
        inject: () => ({
          hooks: { enabled: policy.enabled },
          setEnabled: (value) => { policy.setEnabled(value) },
        }),
      }, EnabledRow))
    }

    exports.apply = apply;
    exports.inject = ["slots", "locale", "connection", "remote", "settingsScope"];
    return module.exports;
  }
});
