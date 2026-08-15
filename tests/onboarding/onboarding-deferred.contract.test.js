"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function compactFile(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8")
    .replace(/\s+/g, " ");
}

const wizard = compactFile(
  "../../src/app/components/onboarding/onboarding-wizard/onboarding-wizard.component.ts",
);
const auth = compactFile(
  "../../src/app/shared/services/firebase/auth.service.ts",
);

// Posponer es una decisión persistida en progreso V2, no un flag efímero de
// sesión. Debe escribirse antes de navegar a welcome.
assert.match(
  wizard,
  /async continueLater\(\).*?this\.deferred = true.*?await this\.persistProgress\(\).*?navigate\(\['\/welcome'\]\)/,
);
assert.match(
  wizard,
  /async exploreNow\(\).*?this\.deferred = true.*?await this\.persistProgress\(\).*?navigate\(\['\/welcome'\]\)/,
);
assert.match(wizard, /draft: \{.*?deferred: this\.deferred/);

// Entrar voluntariamente al wizard consume el aplazamiento y lo sincroniza;
// así el siguiente login vuelve a guiar si la persona salió sin posponer otra vez.
assert.match(wizard, /await this\.clearDeferredOnEntry\(\)/);
assert.match(
  wizard,
  /async clearDeferredOnEntry\(\).*?if \(!this\.deferred\) return.*?this\.deferred = false.*?saveV2Progress\(this\.buildProgress\(\)\)/,
);

// Login usa estado remoto autenticado: nuevo/incompleto -> wizard; aplazado ->
// welcome con banner; completado -> welcome sin banner.
assert.match(auth, /await this\.onboardingService\.getOnboardingEntryState\(\)/);
assert.match(
  auth,
  /if \(!onboardingEntry\.completed\).*?setItem\('showOnboardingBanner', 'true'\).*?navigate\(\[onboardingEntry\.deferred \? "\/welcome" : "\/onboarding"\]\)/,
);

console.log("onboarding-deferred.contract.test.js: OK");
