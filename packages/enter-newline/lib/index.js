/**
 * Host half of the enter-newline browser plugin. Registers the durable
 * "ui-enter-newline" user-settings section so the browser half can persist
 * the Enter-behavior toggle. The browser half (exports["./client"], declared
 * through the package.json dsh.client manifest) owns the actual behavior.
 */
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

/** Settings namespace owned by the enter-newline plugin. */
export const ENTER_NEWLINE_NAMESPACE = "ui-enter-newline";

/** Field carrying the composer plain-Enter behavior. */
export const ENTER_BEHAVIOR_FIELD = "enterBehavior";

/** Accepted plain-Enter behaviors. */
export const ENTER_BEHAVIORS = ["send", "newline"];

/** Default preserves the product's Enter-to-send behavior. */
export const DEFAULT_ENTER_BEHAVIOR = "send";

/** Durable schema; also the wire envelope the browser scope validates against. */
export const EnterBehaviorSchema = z.object({
  [ENTER_BEHAVIOR_FIELD]: z.union([...ENTER_BEHAVIORS]).default(DEFAULT_ENTER_BEHAVIOR),
});

/**
 * Register the durable composer-Enter section when a settings provider exists.
 * @param ctx - Host context whose optional settings service owns the section.
 */
export function apply(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(ENTER_NEWLINE_NAMESPACE), EnterBehaviorSchema);
  });
}
