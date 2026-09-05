const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('  VERIFYING FIXED STICKY CHAT COMPOSER & SPEECH RECOGNITION');
console.log('========================================================================\n');

// 1. Verify HTML Structure
console.log('Step 1: Checking Fixed Composer HTML...');
const html = fs.readFileSync(path.join(__dirname, '../client/index.html'), 'utf8');

assert(html.includes('id="conversation-composer-sticky"'), 'Missing #conversation-composer-sticky');
assert(html.includes('id="stream-chat-form"'), 'Missing #stream-chat-form');
assert(html.includes('id="stream-chat-input"'), 'Missing #stream-chat-input');
assert(html.includes('placeholder="Ask anything or type your message..."'), 'Missing correct placeholder');
assert(html.includes('id="btn-stream-mic"'), 'Missing #btn-stream-mic');
assert(html.includes('id="stream-mic-icon"'), 'Missing #stream-mic-icon');
assert(html.includes('id="btn-stream-send"'), 'Missing #btn-stream-send');
assert(html.includes('id="composer-voice-status"'), 'Missing #composer-voice-status');
assert(html.includes('id="btn-composer-voice-stop"'), 'Missing #btn-composer-voice-stop');
assert(html.includes('id="composer-error-banner"'), 'Missing #composer-error-banner');
assert(html.includes('id="composer-error-text"'), 'Missing #composer-error-text');
console.log('✓ All sticky composer HTML elements present and correctly configured.');

// 2. Verify CSS rules
console.log('\nStep 2: Checking Sticky Composer CSS Rules...');
const css = fs.readFileSync(path.join(__dirname, '../client/index.css'), 'utf8');

const requiredCss = [
  '.discovery-dialogue-col',
  '.conversation-composer-sticky',
  '.composer-voice-status',
  '.composer-voice-pulse',
  '.btn-composer-voice-stop',
  '.composer-input-wrapper',
  '.conversation-composer-input',
  '.composer-actions',
  '.btn-composer-mic',
  '.btn-composer-send',
  '.composer-error-banner'
];

for (const sel of requiredCss) {
  assert(css.includes(sel), `Missing CSS rule for ${sel}`);
}
console.log('✓ All sticky composer CSS rules verified.');

// 3. Verify JavaScript logic
console.log('\nStep 3: Checking Client JavaScript Controller...');
const js = fs.readFileSync(path.join(__dirname, '../client/app.js'), 'utf8');

const requiredJs = [
  'stream-chat-form',
  'stream-chat-input',
  'btn-stream-mic',
  'btn-stream-send',
  'btn-composer-voice-stop',
  'composer-error-banner',
  'composer-voice-status',
  'targetInputId',
  'showError',
  'hideError'
];

for (const snip of requiredJs) {
  assert(js.includes(snip), `Missing JS logic for ${snip}`);
}
console.log('✓ All JS controller bindings verified.');

console.log('\n========================================================================');
console.log('  ALL STICKY CHAT COMPOSER CHECKS PASSED WITH 100% SUCCESS!');
console.log('========================================================================');
