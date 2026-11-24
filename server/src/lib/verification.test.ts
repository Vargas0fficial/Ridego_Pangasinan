import test from 'node:test';
import assert from 'node:assert/strict';
import { codeMatches, hashCode, newCode, mailText, mailSubject } from './verification';

test('newCode is always 6 digits', () => {
  for (let i = 0; i < 500; i++) assert.match(newCode(), /^\d{6}$/);
});

test('codeMatches accepts the right code and rejects others', () => {
  const phone = '+639170000009';
  const hash = hashCode(phone, '123456');
  assert.equal(codeMatches(phone, '123456', hash), true);
  assert.equal(codeMatches(phone, '123457', hash), false);
  assert.equal(codeMatches('+639170000008', '123456', hash), false, 'same code, different phone');
});

test('the code is not stored in plain text', () => {
  assert.ok(!hashCode('+639170000009', '123456').includes('123456'));
});

test('email carries the code and the brand', () => {
  assert.ok(mailText('654321').includes('654321') && mailText('654321').includes('RideGo Pangasinan'));
  assert.ok(mailSubject('654321').includes('654321'));
});