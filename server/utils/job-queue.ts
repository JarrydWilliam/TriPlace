/**
 * SameVibe Scalability Infrastructure — Asynchronous Job Queue
 *
 * Offloads non-blocking tasks (e.g. AI agent updates, telemetry batching,
 * notification dispatches) from the HTTP response loop, ensuring sub-50ms
 * HTTP response latency.
 */

type JobHandler = () => Promise<void>;

interface Job {
  id: string;
  handler: JobHandler;
  retries: number;
}

class JobQueue {
  private queue: Job[] = [];
  private isProcessing = false;
  private maxRetries = 2;
  private maxConcurrency = 3;
  private activeCount = 0;

  /**
   * Enqueue a non-blocking background job
   */
  enqueue(name: string, handler: JobHandler): void {
    const job: Job = {
      id: `${name}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      handler,
      retries: 0,
    };
    this.queue.push(job);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeCount++;

    try {
      await job.handler();
    } catch (error) {
      console.error(`[JobQueue] Job ${job.id} failed:`, error);
      if (job.retries < this.maxRetries) {
        job.retries++;
        this.queue.push(job);
      }
    } finally {
      this.activeCount--;
      setImmediate(() => this.processNext());
    }
  }
}

export const jobQueue = new JobQueue();
