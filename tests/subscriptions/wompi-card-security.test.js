"use strict";

const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
require("ts-node/register/transpile-only");

global.window = {
  crypto: webcrypto,
  isSecureContext: true,
  location: { hostname: "localhost" },
};

const {
  detectCardBrand,
  encryptCardDataForWompi,
  formatCardNumber,
  isValidCardHolder,
  isValidCvc,
  isValidExpiry,
  passesLuhn,
} = require("../../src/app/shared/utils/wompi-card-security.utils.ts");

const fromBase64Url = (value) => Buffer.from(value, "base64url");

(async () => {
  assert.equal(formatCardNumber("4242abc424242424242"), "4242 4242 4242 4242");
  assert.equal(detectCardBrand("424242"), "visa");
  assert.equal(detectCardBrand("555555"), "mastercard");
  assert.equal(detectCardBrand("378282"), "amex");
  assert.equal(passesLuhn("4242 4242 4242 4242"), true);
  assert.equal(passesLuhn("4242 4242 4242 4243"), false);
  assert.equal(isValidExpiry("12", "30", new Date("2026-09-01T12:00:00Z")), true);
  assert.equal(isValidExpiry("08", "26", new Date("2026-09-01T12:00:00Z")), false);
  assert.equal(isValidCvc("123", "visa"), true);
  assert.equal(isValidCvc("1234", "visa"), false);
  assert.equal(isValidCvc("1234", "amex"), true);
  assert.equal(isValidCardHolder("ANA PÉREZ"), true);
  assert.equal(isValidCardHolder("123"), false);

  const keyPair = await webcrypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );
  const spki = Buffer.from(await webcrypto.subtle.exportKey("spki", keyPair.publicKey));
  const pem = `-----BEGIN PUBLIC KEY-----\n${spki.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
  const card = {
    number: "4242424242424242",
    exp_month: "12",
    exp_year: "30",
    cvc: "123",
    card_holder: "ANA PEREZ",
  };
  const compactJwe = await encryptCardDataForWompi(card, pem);
  const [header, encryptedKey, iv, ciphertext, tag] = compactJwe.split(".");
  assert.equal(compactJwe.split(".").length, 5, "Wompi debe recibir un JWE compacto");
  assert.deepEqual(JSON.parse(fromBase64Url(header).toString()), { alg: "RSA-OAEP-256", enc: "A256GCM" });

  const cek = await webcrypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    keyPair.privateKey,
    fromBase64Url(encryptedKey),
  );
  const aesKey = await webcrypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["decrypt"]);
  const encryptedContent = Buffer.concat([fromBase64Url(ciphertext), fromBase64Url(tag)]);
  const plaintext = await webcrypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64Url(iv),
      additionalData: Buffer.from(header),
      tagLength: 128,
    },
    aesKey,
    encryptedContent,
  );
  assert.deepEqual(JSON.parse(Buffer.from(plaintext).toString()), card);

  console.log("wompi-card-security.test.js: OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
