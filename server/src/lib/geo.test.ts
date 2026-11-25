import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fareFor, haversineKm, inServiceArea, serviceFeeFor } from './geo';

test('Dagupan to Calasiao is about 4.3 km in a straight line', () => {
  const km = haversineKm({ lat: 16.043, lng: 120.333 }, { lat: 16.011, lng: 120.355 });
  assert.ok(km > 4.1 && km < 4.5, `got ${km}`);
});

test('fare for a 4.8 km trip is P60', () => {
  assert.equal(fareFor(4.8), 60);
});

test('fare never goes below the P35 minimum', () => {
  assert.equal(fareFor(0.3), 35);
});

test('service fee is 15 percent, rounded', () => {
  assert.equal(serviceFeeFor(95), 14);
});

test('service area covers Dagupan and rejects Manila', () => {
  assert.equal(inServiceArea({ lat: 16.043, lng: 120.333 }), true);
  assert.equal(inServiceArea({ lat: 14.5995, lng: 120.9842 }), false);
});