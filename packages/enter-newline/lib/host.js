

/** Factory receives the versioned StarPivot host API after admission. */
export default function createHost(api) {
  const { settingsNamespace, z } = api


/** Settings namespace owned by the enter-newline plugin. */
const ENTER_NEWLINE_NAMESPACE = "ui-enter-newline";


/** Field carrying the composer plain-Enter behavior. */
const ENTER_BEHAVIOR_FIELD = "enterBehavior";


/** Accepted plain-Enter behaviors. */
const ENTER_BEHAVIORS = ["send", "newline"];


/** Default preserves the product's Enter-to-send behavior. */
const DEFAULT_ENTER_BEHAVIOR = "send";


/** Durable schema; also the wire envelope the browser scope validates against. */
const EnterBehaviorSchema = z.object({
  [ENTER_BEHAVIOR_FIELD]: z.union([...ENTER_BEHAVIORS]).default(DEFAULT_ENTER_BEHAVIOR),
});


/**
 * Register the durable composer-Enter section when a settings provider exists.
 * @param ctx - Host context whose optional settings service owns the section.
 */
function apply(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(ENTER_NEWLINE_NAMESPACE), EnterBehaviorSchema);
  });
}
  return { ENTER_NEWLINE_NAMESPACE, ENTER_BEHAVIOR_FIELD, ENTER_BEHAVIORS, DEFAULT_ENTER_BEHAVIOR, EnterBehaviorSchema, apply }
}
