/** Every capture/record script with ?dev=1 must call this first — blocks production PUNK_BASE. */
const { assertNoProductionBase } = require("./guard-no-prod-firebase.js");
assertNoProductionBase();
