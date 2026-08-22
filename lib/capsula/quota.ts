export const CAPSULA_TTS_WINDOW_MS = 10 * 60 * 1000;
export const CAPSULA_MAX_TTS_REQUESTS_PER_WINDOW = 20;
export const CAPSULA_MAX_TTS_CHARS_TOTAL = 12_000;
export const CAPSULA_MAX_RECORDINGS = 3;
export const CAPSULA_MAX_RECORDING_BYTES_TOTAL = 1024 * 1024 * 1024;

type Usage = {
  expiresAtMs: number;
  ttsWindowStartedAtMs: number;
  ttsWindowRequests: number;
  ttsCharsTotal: number;
  recordingCount: number;
  recordingBytesTotal: number;
};

export class CapsulaQuotaStore {
  private readonly usage = new Map<string, Usage>();

  private entry(jti: string, expiresAtMs: number, nowMs: number): Usage {
    for (const [key, value] of this.usage) {
      if (value.expiresAtMs <= nowMs) this.usage.delete(key);
    }
    let value = this.usage.get(jti);
    if (!value) {
      value = {
        expiresAtMs,
        ttsWindowStartedAtMs: nowMs,
        ttsWindowRequests: 0,
        ttsCharsTotal: 0,
        recordingCount: 0,
        recordingBytesTotal: 0,
      };
      this.usage.set(jti, value);
    }
    return value;
  }

  consumeTts(jti: string, chars: number, expiresAtMs: number, nowMs = Date.now()): boolean {
    const value = this.entry(jti, expiresAtMs, nowMs);
    if (nowMs - value.ttsWindowStartedAtMs >= CAPSULA_TTS_WINDOW_MS) {
      value.ttsWindowStartedAtMs = nowMs;
      value.ttsWindowRequests = 0;
    }
    if (
      value.ttsWindowRequests >= CAPSULA_MAX_TTS_REQUESTS_PER_WINDOW ||
      value.ttsCharsTotal + chars > CAPSULA_MAX_TTS_CHARS_TOTAL
    ) {
      return false;
    }
    value.ttsWindowRequests += 1;
    value.ttsCharsTotal += chars;
    return true;
  }

  reserveRecording(jti: string, expiresAtMs: number, nowMs = Date.now()): boolean {
    const value = this.entry(jti, expiresAtMs, nowMs);
    if (value.recordingCount >= CAPSULA_MAX_RECORDINGS) return false;
    value.recordingCount += 1;
    return true;
  }

  commitRecordingBytes(
    jti: string,
    bytes: number,
    expiresAtMs: number,
    nowMs = Date.now(),
  ): boolean {
    const value = this.entry(jti, expiresAtMs, nowMs);
    if (value.recordingBytesTotal + bytes > CAPSULA_MAX_RECORDING_BYTES_TOTAL) return false;
    value.recordingBytesTotal += bytes;
    return true;
  }
}

const globalQuota = globalThis as typeof globalThis & {
  __capsulaQuotaStore?: CapsulaQuotaStore;
};

export const capsulaQuotaStore =
  globalQuota.__capsulaQuotaStore ?? (globalQuota.__capsulaQuotaStore = new CapsulaQuotaStore());
