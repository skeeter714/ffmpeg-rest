import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '~/app';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { Worker } from 'bullmq';
import { connection } from '~/config/redis';
import { QUEUE_NAME, JobType } from '~/queue';
import type { JobResult } from '~/queue';
import { processMediaProbe } from '~/queue/media/processor';

const TEST_DIR = path.join(process.cwd(), 'test-outputs', 'media-controller');
const FIXTURES_DIR = path.join(process.cwd(), 'test-fixtures', 'media-controller');

describe('Media Controller', () => {
  const app = createApp();
  let worker: Worker;

  beforeAll(async () => {
    if (!existsSync(FIXTURES_DIR)) {
      mkdirSync(FIXTURES_DIR, { recursive: true });
    }

    worker = new Worker<unknown, JobResult>(
      QUEUE_NAME,
      async (job) => {
        switch (job.name) {
          case JobType.MEDIA_PROBE:
            return processMediaProbe(job as never);
          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }
      },
      { connection }
    );
  });

  afterAll(async () => {
    await worker?.close();

    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    if (existsSync(FIXTURES_DIR)) {
      rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
  });

  describe('POST /media/info', () => {
    it('should probe video file and return metadata', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-video.avi');
      createTestVideoFile(inputPath);

      const formData = new FormData();
      const fileBuffer = readFileSync(inputPath);
      const file = new File([fileBuffer], 'test.avi', {
        type: 'video/x-msvideo'
      });
      formData.append('file', file);

      const res = await app.request('/media/info', {
        method: 'POST',
        body: formData
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const json = await res.json();
      expect(json).toHaveProperty('format');
      expect(json).toHaveProperty('streams');
      expect(json.format).toHaveProperty('format_name');
      expect(json.streams).toBeInstanceOf(Array);
      expect(json.streams.length).toBeGreaterThan(0);
    });

    it('should probe audio file and return metadata', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-audio.mp3');
      createTestAudioFile(inputPath);

      const formData = new FormData();
      const fileBuffer = readFileSync(inputPath);
      const file = new File([fileBuffer], 'test.mp3', {
        type: 'audio/mpeg'
      });
      formData.append('file', file);

      const res = await app.request('/media/info', {
        method: 'POST',
        body: formData
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const json = await res.json();
      expect(json).toHaveProperty('format');
      expect(json).toHaveProperty('streams');
      expect(json.format.format_name).toContain('mp3');
    });

    it('should return 400 for invalid file', async () => {
      const formData = new FormData();
      const file = new File(['invalid media data'], 'invalid.mp3', { type: 'audio/mpeg' });
      formData.append('file', file);

      const res = await app.request('/media/info', {
        method: 'POST',
        body: formData
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 for missing file', async () => {
      const formData = new FormData();

      const res = await app.request('/media/info', {
        method: 'POST',
        body: formData
      });

      expect(res.status).toBe(400);
    });
  });
});

function createTestVideoFile(outputPath: string): void {
  execSync(
    `ffmpeg -f lavfi -i testsrc=duration=2:size=320x240:rate=30 -f lavfi -i sine=frequency=1000:duration=2:sample_rate=44100 -ac 2 -pix_fmt yuv420p -y "${outputPath}"`,
    { stdio: 'pipe' }
  );
}

function createTestAudioFile(outputPath: string): void {
  execSync(
    `ffmpeg -f lavfi -i "sine=frequency=1000:duration=1" -codec:a libmp3lame -qscale:a 2 -y "${outputPath}"`,
    { stdio: 'pipe' }
  );
}
