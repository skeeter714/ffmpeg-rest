import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '~/app';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { Worker } from 'bullmq';
import { connection } from '~/config/redis';
import { QUEUE_NAME, JobType } from '~/queue';
import type { JobResult } from '~/queue';
import { processImageToJpg } from '~/queue/image/processor';

const TEST_DIR = path.join(process.cwd(), 'test-outputs', 'image-controller');
const FIXTURES_DIR = path.join(process.cwd(), 'test-fixtures', 'image-controller');

describe('Image Controller', () => {
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
          case JobType.IMAGE_TO_JPG:
            return processImageToJpg(job as never);
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

  describe('POST /image/jpg', () => {
    it('should convert PNG to JPG', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test.png');
      createTestPngFile(inputPath);

      const formData = new FormData();
      const fileBuffer = readFileSync(inputPath);
      const file = new File([fileBuffer], 'test.png', {
        type: 'image/png'
      });
      formData.append('file', file);

      const res = await app.request('/image/jpg', {
        method: 'POST',
        body: formData
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/jpeg');

      const arrayBuffer = await res.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should return 400 for invalid file', async () => {
      const formData = new FormData();
      const file = new File(['invalid image data'], 'invalid.png', { type: 'image/png' });
      formData.append('file', file);

      const res = await app.request('/image/jpg', {
        method: 'POST',
        body: formData
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toHaveProperty('error');
    });

    it('should return 400 for missing file', async () => {
      const formData = new FormData();

      const res = await app.request('/image/jpg', {
        method: 'POST',
        body: formData
      });

      expect(res.status).toBe(400);
    });
  });
});

function createTestPngFile(outputPath: string): void {
  execSync(
    `ffmpeg -f lavfi -i color=c=blue:s=320x240:d=1 -frames:v 1 -y "${outputPath}"`,
    { stdio: 'pipe' }
  );
}
