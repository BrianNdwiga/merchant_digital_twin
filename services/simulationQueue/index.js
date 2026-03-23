// Simulation Queue Service
// Exposes HTTP API to enqueue merchant simulation jobs into Redis BullMQ

const express = require('express');
const { Queue } = require('bullmq');
const { Redis: IORedis } = require('ioredis');

const app = express();
app.use(express.json());

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const PORT = parseInt(process.env.PORT || '3005');

// Shared Redis connection
const connection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null
});

// BullMQ queue
const simulationQueue = new Queue('merchant-simulations', { connection });

// Enqueue a single merchant job
// POST /enqueue  body: { merchantId, persona, networkProfile, deviceProfile, onboardingUrl, scenarioId, ... }
app.post('/enqueue', async (req, res) => {
  try {
    const job = await simulationQueue.add('simulate', req.body, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 }
    });
    res.json({ jobId: job.id, merchantId: req.body.merchantId });
  } catch (err) {
    console.error('Enqueue error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Enqueue a batch of merchant jobs
// POST /enqueue-batch  body: { merchants: [...], scenarioId, runId, onboardingUrl }
app.post('/enqueue-batch', async (req, res) => {
  const { merchants, scenarioId, runId, onboardingUrl } = req.body;
  if (!Array.isArray(merchants)) {
    return res.status(400).json({ error: 'merchants must be an array' });
  }

  try {
    const jobs = merchants.map(m => ({
      name: 'simulate',
      data: { ...m, scenarioId, runId, onboardingUrl },
      opts: { attempts: 2, backoff: { type: 'exponential', delay: 2000 } }
    }));

    await simulationQueue.addBulk(jobs);
    console.log(`Enqueued ${jobs.length} merchant jobs for scenario ${scenarioId} run ${runId}`);
    res.json({ enqueued: jobs.length, scenarioId, runId });
  } catch (err) {
    console.error('Batch enqueue error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Queue stats
app.get('/stats', async (req, res) => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      simulationQueue.getWaitingCount(),
      simulationQueue.getActiveCount(),
      simulationQueue.getCompletedCount(),
      simulationQueue.getFailedCount()
    ]);
    res.json({ waiting, active, completed, failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Simulation Queue Service listening on port ${PORT}`);
  console.log(`Redis: ${REDIS_HOST}:${REDIS_PORT}`);
});
