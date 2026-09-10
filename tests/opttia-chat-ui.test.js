'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const floating = fs.readFileSync('src/app/shared/components/floating-button/floating-button.component.html', 'utf8');
const chat = fs.readFileSync('src/app/shared/components/opttia-chat/opttia-chat.component.html', 'utf8');

test('el chat ofrece minimizar separado de maximizar y cerrar', () => {
  assert.match(floating, /\(click\)="minimizeChat\(\$event\)"/);
  assert.match(floating, /aria-label="Minimizar chat de Opttia"/);
  assert.match(floating, /\(click\)="toggleChatSize\(\$event\)"/);
  assert.match(floating, /aria-label="Cerrar chat de Opttia"/);
});

test('Tuki aparece únicamente como avatar de las respuestas de Opttia', () => {
  assert.match(chat, /message\.role === 'assistant'; else userAvatar/);
  assert.match(chat, /assets\/images\/opttia\/tuki-avatar-v1\.webp/);
  assert.match(chat, /#userAvatar><i class="fa fa-user"><\/i>/);
});
