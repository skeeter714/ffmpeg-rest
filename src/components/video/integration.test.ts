import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, getApiUrl } from '~/test-utils/integration-setup';
import { readFile } from 'fs/promises';
import path from 'path';

describe('Video Processing Integration', () => {
  beforeAll(async () => {
    await setupIntegrationTests();
  }, 120000);

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  it('should convert video to MP4', async () => {
    const apiUrl = getApiUrl();
    const testVideoPath = path.join(__dirname, '../../../test-video.mp4');
    const videoBuffer = await readFile(testVideoPath);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(videoBuffer)], { type: 'video/mp4' });
    formData.append('file', blob, 'test-video.mp4');

    const response = await fetch(`${apiUrl}/video/mp4`, {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('video/mp4');

    const resultBuffer = await response.arrayBuffer();
    expect(resultBuffer.byteLength).toBeGreaterThan(0);
  }, 30000);

  it('should extract audio from video', async () => {
    const apiUrl = getApiUrl();
    const testVideoPath = path.join(__dirname, '../../../test-video.mp4');
    const videoBuffer = await readFile(testVideoPath);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(videoBuffer)], { type: 'video/mp4' });
    formData.append('file', blob, 'test-video.mp4');

    const response = await fetch(`${apiUrl}/video/audio`, {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/wav');

    const resultBuffer = await response.arrayBuffer();
    expect(resultBuffer.byteLength).toBeGreaterThan(0);
  }, 30000);

  it('should extract frames from video', async () => {
    const apiUrl = getApiUrl();
    const testVideoPath = path.join(__dirname, '../../../test-video.mp4');
    const videoBuffer = await readFile(testVideoPath);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(videoBuffer)], { type: 'video/mp4' });
    formData.append('file', blob, 'test-video.mp4');

    const response = await fetch(`${apiUrl}/video/frames?fps=1&compress=zip`, {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');

    const resultBuffer = await response.arrayBuffer();
    expect(resultBuffer.byteLength).toBeGreaterThan(0);
  }, 30000);

  it('should reject invalid file', async () => {
    const apiUrl = getApiUrl();
    const formData = new FormData();
    const blob = new Blob(['not a video file'], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');

    const response = await fetch(`${apiUrl}/video/mp4`, {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  }, 30000);
});
