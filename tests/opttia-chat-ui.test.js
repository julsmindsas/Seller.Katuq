'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const floating = fs.readFileSync('src/app/shared/components/floating-button/floating-button.component.html', 'utf8');
const floatingComponent = fs.readFileSync('src/app/shared/components/floating-button/floating-button.component.ts', 'utf8');
const chat = fs.readFileSync('src/app/shared/components/opttia-chat/opttia-chat.component.html', 'utf8');
const es = JSON.parse(fs.readFileSync('src/assets/i18n/es.json', 'utf8'));

test('el chat ofrece minimizar separado de maximizar y cerrar', () => {
  assert.match(floating, /\(click\)="minimizeChat\(\$event\)"/);
  // IDI-B12f: el texto pasó al traductor; la plantilla pide la clave y es.json conserva el texto.
  assert.match(floating, /\[attr\.aria-label\]="'asistentes\.floatingButton\.minimizarChatDeOpttia' \| translate"/);
  assert.equal(es['asistentes.floatingButton.minimizarChatDeOpttia'], 'Minimizar chat de Opttia');
  assert.match(floating, /\(click\)="toggleChatSize\(\$event\)"/);
  assert.match(floating, /'asistentes\.floatingButton\.cerrarChatDeOpttia' \| translate/);
  assert.equal(es['asistentes.floatingButton.cerrarChatDeOpttia'], 'Cerrar chat de Opttia');
  assert.match(floating, /'asistentes\.floatingButton\.restaurarChatDeOpttia' \| translate/);
  assert.equal(es['asistentes.floatingButton.restaurarChatDeOpttia'], 'Restaurar chat de Opttia');
  assert.match(floatingComponent, /minimizeChat[\s\S]*?this\.chatMinimized = true;[\s\S]*?this\.chatFormVisible = true;/);
});

test('Tuki aparece únicamente como avatar de las respuestas de Opttia', () => {
  assert.match(chat, /message\.role === 'assistant'; else userAvatar/);
  assert.match(chat, /assets\/images\/opttia\/tuki-avatar-v1\.webp/);
  assert.match(chat, /#userAvatar><i class="fa fa-user"><\/i>/);
});
