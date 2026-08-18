/** Field carrying the delivery mode for plain Enter while an agent is busy. */
export const FIELD = 'busyEnter'

/**
 * Whether the user section still inherits the product default.
 * @param {unknown} user raw user section from settings.describe()
 * @returns {boolean} true when busyEnter is not a user override
 */
export function shouldSeedSteer(user) {
  if (user === undefined || user === null || typeof user !== 'object' || Array.isArray(user)) {
    return true
  }
  return !Object.hasOwn(user, FIELD)
}
