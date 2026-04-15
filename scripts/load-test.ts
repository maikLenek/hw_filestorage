/**
 * Load test script for the File Storage Microservice by AI.
 *
 * Uploads 300,000 files (10 categories × 30,000 files, ~100 KB each).
 *
 * Usage:
 *   npm run load-test
 *   BASE_URL=http://localhost:3000 CONCURRENCY=100 npm run load-test
 *
 * Environment variables:
 *   BASE_URL            — default: http://localhost:3000
 *   CONCURRENCY         — default: 50
 *   CATEGORIES          — default: 10
 *   FILES_PER_CATEGORY  — default: 30000
 */

import axios from 'axios';
import FormData from 'form-data';
import pLimit from 'p-limit';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? '50', 10);
const CATEGORIES = parseInt(process.env.CATEGORIES ?? '10', 10);
const FILES_PER_CATEGORY = parseInt(
  process.env.FILES_PER_CATEGORY ?? '30000',
  10,
);
const FILE_SIZE = 100 * 1024;

const TOTAL_FILES = CATEGORIES * FILES_PER_CATEGORY;
const PROGRESS_INTERVAL = 1_000;

function zeroPad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function percentile(sorted: number[], p: number): number {
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function formatElapsed(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

async function uploadFile(
  category: string,
  fileId: string,
  fileBuffer: Buffer,
): Promise<number | null> {
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename: `${fileId}.bin`,
    contentType: 'application/octet-stream',
    knownLength: fileBuffer.length,
  });

  const start = Date.now();

  try {
    await axios.post(`${BASE_URL}/v1/files/${category}/${fileId}`, form, {
      headers: form.getHeaders(),
      maxBodyLength: FILE_SIZE * 2,
      timeout: 30_000,
    });
    return Date.now() - start;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) {
        return Date.now() - start;
      }
      return null;
    }
    return null;
  }
}

async function main(): Promise<void> {
  console.log('File Storage Load Test');
  console.log(`  Target: ${BASE_URL}`);
  console.log(
    `  Categories: ${CATEGORIES} × ${FILES_PER_CATEGORY} files = ${TOTAL_FILES} total`,
  );
  console.log(`  File size: ${FILE_SIZE / 1024} KB`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log('');

  const fileContent = Buffer.alloc(FILE_SIZE);
  for (let i = 0; i < FILE_SIZE; i++) {
    fileContent[i] = Math.floor(Math.random() * 256);
  }

  const limit = pLimit(CONCURRENCY);

  let completed = 0;
  let failures = 0;
  const latencies: number[] = [];
  const globalStart = Date.now();

  const tasks: Promise<void>[] = [];
  for (let c = 0; c < CATEGORIES; c++) {
    const category = `category_${zeroPad(c, 2)}`;

    for (let f = 1; f <= FILES_PER_CATEGORY; f++) {
      const fileId = `file-${zeroPad(f, 6)}`;

      tasks.push(
        limit(async () => {
          const latency = await uploadFile(category, fileId, fileContent);

          completed++;

          if (latency !== null) {
            latencies.push(latency);
          } else {
            failures++;
          }

          if (completed % PROGRESS_INTERVAL === 0) {
            const now = Date.now();
            const elapsed = (now - globalStart) / 1000;
            const rate = Math.round(completed / elapsed);
            const pct = ((completed / TOTAL_FILES) * 100).toFixed(1);
            console.log(
              `[overall] ${completed.toLocaleString()} / ${TOTAL_FILES.toLocaleString()}` +
                ` — ${pct}% — elapsed ${formatElapsed(now - globalStart)}` +
                ` — rate ${rate} req/s`,
            );
          }
        }),
      );
    }
  }

  await Promise.all(tasks);

  const totalElapsed = Date.now() - globalStart;
  const totalElapsedSec = totalElapsed / 1000;
  const avgRate = Math.round(TOTAL_FILES / totalElapsedSec);

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p50 = percentile(sortedLatencies, 50);
  const p95 = percentile(sortedLatencies, 95);

  const successRate = ((completed - failures) / TOTAL_FILES) * 100;

  console.log('');
  console.log(
    `✓ Done. Total: ${TOTAL_FILES.toLocaleString()} files` +
      ` | Elapsed: ${formatElapsed(totalElapsed)}` +
      ` | Avg rate: ${avgRate} req/s`,
  );
  console.log(`  p50 latency: ${p50}ms | p95 latency: ${p95}ms`);
  console.log(
    `  Success rate: ${successRate.toFixed(2)}% (${failures} failures)`,
  );

  if (failures / TOTAL_FILES > 0.05) {
    console.error(
      `\n✗ Failure rate ${((failures / TOTAL_FILES) * 100).toFixed(2)}% exceeds 5% threshold.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Load test fatal error:', err);
  process.exit(1);
});
