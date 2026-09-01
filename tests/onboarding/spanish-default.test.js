"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("ts-node/register/transpile-only");

const {
  DEFAULT_APP_LANGUAGE,
  normalizeAppLanguage,
} = require("../../src/app/shared/utils/app-language.utils.ts");

assert.strictEqual(DEFAULT_APP_LANGUAGE.code, "es");
assert.strictEqual(normalizeAppLanguage(undefined).code, "es");
assert.strictEqual(normalizeAppLanguage(null).code, "es");
assert.strictEqual(normalizeAppLanguage("es").language, "Español");
assert.strictEqual(normalizeAppLanguage({ code: "es" }).icon, "co");
assert.strictEqual(normalizeAppLanguage("idioma-invalido").code, "es");
assert.strictEqual(normalizeAppLanguage("EN").code, "en");
assert.strictEqual(normalizeAppLanguage({ code: "pt" }).code, "pt");

function compact(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8")
    .replace(/\s+/g, " ");
}

const appModule = compact("../../src/app/app.module.ts");
const auth = compact("../../src/app/shared/services/firebase/auth.service.ts");
const translateModule = compact("../../src/app/shared/modules/translate.module.ts");

assert.match(appModule, /defaultLanguage: 'es'/);
assert.match(auth, /result\.lang = this\.setLanguage\(result\.lang\)/);
assert.match(auth, /SignOut\(\).*?this\.setLanguage\(DEFAULT_APP_LANGUAGE\)/);
assert.doesNotMatch(translateModule, /TranslateModule\.forRoot/);

console.log("spanish-default.test.js: OK");
