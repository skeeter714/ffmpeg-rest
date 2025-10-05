import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, getApiUrl } from '~/test-utils/integration-setup';
import { readFile } from 'fs/promises';
import path from 'path';

describe('Audio Conversion Integration', () => {
  beforeAll(async () => {
    await setupIntegrationTests();
  }, 120000);

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  it('should convert WAV to MP3', async () => {
    const apiUrl = getApiUrl();
    const testAudioPath = path.join(__dirname, '../../../test-audio.wav');
    const audioBuffer = await readFile(testAudioPath);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
    formData.append('file', blob, 'test-audio.wav');

    const response = await fetch(`${apiUrl}/audio/mp3`, {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/mpeg');

    const resultBuffer = await response.arrayBuffer();
    expect(resultBuffer.byteLength).toBeGreaterThan(0);
  }, 30000);

  it('should convert WAV to WAV (re-encode)', async () => {
    const apiUrl = getApiUrl();
    const testAudioPath = path.join(__dirname, '../../../test-audio.wav');
    const audioBuffer = await readFile(testAudioPath);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
    formData.append('file', blob, 'test-audio.wav');

    const response = await fetch(`${apiUrl}/audio/wav`, {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/wav');

    const resultBuffer = await response.arrayBuffer();
    expect(resultBuffer.byteLength).toBeGreaterThan(0);
  }, 30000);

  it('should reject invalid file', async () => {
    const apiUrl = getApiUrl();
    const formData = new FormData();
    const blob = new Blob(['not an audio file'], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');

    const response = await fetch(`${apiUrl}/audio/mp3`, {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  }, 30000);
});
