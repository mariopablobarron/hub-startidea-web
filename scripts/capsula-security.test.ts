import assert from "node:assert/strict";
import test from "node:test";
import {
  capabilityHasScope,
  issueCapsulaCapability,
  verifyCapsulaCapability,
} from "../lib/capsula/capability";
import { isExactSameOrigin } from "../lib/capsula/origin";
import {
  CAPSULA_MAX_RECORDING_BYTES_TOTAL,
  CAPSULA_MAX_RECORDINGS,
  CAPSULA_MAX_TTS_CHARS_TOTAL,
  CAPSULA_MAX_TTS_REQUESTS_PER_WINDOW,
  CapsulaQuotaStore,
} from "../lib/capsula/quota";

const secret = "test-secret-with-at-least-thirty-two-characters";
const nowMs = Date.UTC(2026, 7, 22, 12, 0, 0);
const jti = "123e4567-e89b-12d3-a456-426614174000";

test("Origin falsificado por substring no se acepta como mismo origen", () => {
  const forged = new Request("https://hubstartidea.es/api/capsula/tts", {
    headers: { Origin: "https://hubstartidea.es.attacker.invalid" },
  });
  const exact = new Request("https://hubstartidea.es/api/capsula/tts", {
    headers: { Origin: "https://hubstartidea.es" },
  });
  assert.equal(isExactSameOrigin(forged), false);
  assert.equal(isExactSameOrigin(exact), true);
});

test("la capacidad es firmada, ligada a sala, scopes y caducidad", () => {
  const { token } = issueCapsulaCapability({ secret, sala: "estudio", nowMs, jti });
  const claims = verifyCapsulaCapability(token, secret, nowMs + 1_000);
  assert.ok(claims);
  assert.equal(claims.sala, "estudio");
  assert.equal(capabilityHasScope(claims, "tts"), true);
  assert.equal(capabilityHasScope(claims, "recording:create"), true);
  assert.equal(capabilityHasScope(claims, "music:read"), true);
  assert.equal(verifyCapsulaCapability(token, `${secret}x`, nowMs), null);
  assert.equal(verifyCapsulaCapability(`${token.slice(0, -1)}x`, secret, nowMs), null);
  assert.equal(verifyCapsulaCapability(token, secret, nowMs + 2 * 60 * 60 * 1000), null);
});

test("la cuota TTS limita ventana y caracteres acumulados", () => {
  const quotas = new CapsulaQuotaStore();
  const expires = nowMs + 2 * 60 * 60 * 1000;
  for (let i = 0; i < CAPSULA_MAX_TTS_REQUESTS_PER_WINDOW; i++) {
    assert.equal(quotas.consumeTts(jti, 1, expires, nowMs), true);
  }
  assert.equal(quotas.consumeTts(jti, 1, expires, nowMs), false);

  const other = "123e4567-e89b-12d3-a456-426614174001";
  assert.equal(quotas.consumeTts(other, CAPSULA_MAX_TTS_CHARS_TOTAL, expires, nowMs), true);
  assert.equal(quotas.consumeTts(other, 1, expires, nowMs + 11 * 60 * 1000), false);
});

test("la cuota de grabaciones limita cantidad y bytes acumulados", () => {
  const quotas = new CapsulaQuotaStore();
  const expires = nowMs + 2 * 60 * 60 * 1000;
  for (let i = 0; i < CAPSULA_MAX_RECORDINGS; i++) {
    assert.equal(quotas.reserveRecording(jti, expires, nowMs), true);
  }
  assert.equal(quotas.reserveRecording(jti, expires, nowMs), false);
  assert.equal(
    quotas.commitRecordingBytes(jti, CAPSULA_MAX_RECORDING_BYTES_TOTAL, expires, nowMs),
    true,
  );
  assert.equal(quotas.commitRecordingBytes(jti, 1, expires, nowMs), false);
});
