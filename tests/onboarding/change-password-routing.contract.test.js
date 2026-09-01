"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const componentPath = path.resolve(
  __dirname,
  "../../src/app/components/change-password/change-password.component.ts",
);
const source = fs.readFileSync(componentPath, "utf8");
const sourceFile = ts.createSourceFile(
  componentPath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const componentClass = sourceFile.statements.find(
  (node) => ts.isClassDeclaration(node) && node.name?.text === "ChangePasswordComponent",
);
assert.ok(componentClass, "No se encontró ChangePasswordComponent");

function methodText(name) {
  const method = componentClass.members.find(
    (member) => ts.isMethodDeclaration(member) && member.name?.getText(sourceFile) === name,
  );
  assert.ok(method, `No se encontró ${name}`);
  return method.getText(sourceFile).replace(/\s+/g, " ");
}

const confirmUpdate = methodText("submit");
const navigate = methodText("navigateAfterPasswordChange");

// La identidad nunca viaja en el payload: el backend la deriva del JWT. El
// componente construye un objeto cerrado con solo newPassword.
const confirmMethod = componentClass.members.find(
  (member) => ts.isMethodDeclaration(member) &&
    member.name?.getText(sourceFile) === "submit",
);
let passwordUpdateInitializer = null;
function findPasswordUpdate(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(sourceFile) === "passwordUpdate"
  ) {
    passwordUpdateInitializer = node.initializer;
  }
  ts.forEachChild(node, findPasswordUpdate);
}
findPasswordUpdate(confirmMethod);
assert.ok(
  passwordUpdateInitializer && ts.isObjectLiteralExpression(passwordUpdateInitializer),
  "passwordUpdate debe ser un objeto literal allowlisted",
);
assert.deepStrictEqual(
  passwordUpdateInitializer.properties.map((property) => property.name?.getText(sourceFile)),
  ["newPassword"],
);
assert.match(confirmUpdate, /this\.service\.changePassword\(passwordUpdate\)/);

const maestroPath = path.resolve(
  __dirname,
  "../../src/app/shared/services/maestros/maestro.service.ts",
);
const maestroSource = fs.readFileSync(maestroPath, "utf8").replace(/\s+/g, " ");
assert.match(
  maestroSource,
  /changePassword\(payload: \{ newPassword: string \}\).*?\/v1\/users\/updateDefaultPassword'.*?\{ newPassword: payload\.newPassword \}/,
);

// Solo se decide la ruta una vez que el cambio de contraseña respondió bien.
assert.match(confirmUpdate, /next: .*?this\.navigateAfterPasswordChange\(user\)/);
assert.doesNotMatch(confirmUpdate, /error: .*?this\.navigateAfterPasswordChange\(user\)/);

// La navegación replica las ramas del login: Super Administrador, Julsmind,
// roles operativos con bienvenida propia y, solo después, Administrador tenant.
assert.match(
  navigate,
  /user\?\.rol === 'Super Administrador'.*?navigate\(\['\/superadmin\/clientes'\]\).*?return/,
);
assert.match(
  navigate,
  /user\?\.rol === 'Administrador' && user\?\.company === 'Julsmind'.*?navigate\(\['\/dashboards'\]\).*?return/,
);
assert.match(
  navigate,
  /user\?\.rol !== 'Administrador'.*?user\?\.bienvenidaPath.*?: '\/welcome'.*?navigate\(\[destination\]\).*?return/,
);
assert.ok(
  navigate.indexOf("user?.rol === 'Super Administrador'") <
    navigate.indexOf("user?.rol !== 'Administrador'"),
  'Super Administrador debe resolverse antes del branch de otros roles',
);

// El Administrador tenant consulta estado autenticado. Incompleto nuevo vuelve
// al wizard; si eligió continuar después aterriza en welcome sin perder el CTA.
assert.match(navigate, /await this\.onboardingService\.getOnboardingEntryState\(\)/);
assert.match(
  navigate,
  /if \(!onboardingEntry\.completed\).*?setItem\('showOnboardingBanner', 'true'\).*?navigate\(\[onboardingEntry\.deferred \? '\/welcome' : '\/onboarding'\]\).*?return/,
);
assert.match(
  navigate,
  /removeItem\('showOnboardingBanner'\).*?catch .*?setItem\('showOnboardingBanner', 'true'\).*?navigate\(\['\/welcome'\]\)/,
);

console.log("change-password-routing.contract.test.js: OK");
