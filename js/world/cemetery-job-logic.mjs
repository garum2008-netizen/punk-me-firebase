/** Cemetery night shift completion (unit-testable, no Three.js). */
export function isCemeteryShiftSuccessful(lit, caught) {
  return lit >= 6 && caught >= 3;
}
