import { Router } from 'express';
import { z } from 'zod';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { workflowEngine } from '../services/automation/workflow-engine.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/workflows - List all workflows
router.get('/', authenticate, async (req, res, next) => {
  try {
    const list = await db.query.workflows.findMany({
      orderBy: [desc(schema.workflows.updatedAt)],
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/workflows/:id - Get single workflow
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const workflow = await db.query.workflows.findFirst({
      where: eq(schema.workflows.id, id),
    });

    if (!workflow) {
      return res.status(404).json({ error: 'NotFound', message: 'Workflow not found.' });
    }

    res.json(workflow);
  } catch (err) {
    next(err);
  }
});

// POST /api/workflows - Create workflow
const workflowSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  triggerType: z.string().default('schedule'),
  cronExpression: z.string().default('0 */2 * * *'),
  nodesJson: z.array(z.any()).default([]),
  edgesJson: z.array(z.any()).default([]),
  settingsJson: z.record(z.any()).default({}),
});

router.post('/', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const data = workflowSchema.parse(req.body);
    const [created] = await db.insert(schema.workflows).values(data).returning();
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

const workflowUpdateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  triggerType: z.string().optional(),
  cronExpression: z.string().optional(),
  nodesJson: z.array(z.any()).optional(),
  edgesJson: z.array(z.any()).optional(),
  settingsJson: z.record(z.any()).optional(),
});

// PUT /api/workflows/:id - Save workflow (nodes, edges, version)
router.put('/:id', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = workflowUpdateSchema.parse(req.body);

    const [updated] = await db.update(schema.workflows)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.workflows.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.delete(schema.workflows).where(eq(schema.workflows.id, id));
    res.json({ message: 'Workflow deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/workflows/:id/run - Execute workflow manually
router.post('/:id/run', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const sampleInput = req.body.sampleInput || req.body;
    const result = await workflowEngine.executeWorkflow(id, 'manual_test_run', sampleInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/workflows/:id/webhook - External Webhook Trigger endpoint
router.post('/:id/webhook', async (req, res, next) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization || req.headers['x-webhook-token'] || req.query.token;

    const workflow = await db.query.workflows.findFirst({
      where: eq(schema.workflows.id, id),
    });

    if (!workflow) {
      return res.status(404).json({ error: 'NotFound', message: 'Workflow not found.' });
    }

    if (!workflow.isActive) {
      return res.status(403).json({ error: 'Forbidden', message: 'Workflow is disabled.' });
    }

    // Verify token if configured in workflow settingsJson
    const expectedToken = (workflow.settingsJson as any)?.webhookSecret || (workflow.settingsJson as any)?.webhookToken;
    if (expectedToken) {
      const providedToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader;
      if (providedToken !== expectedToken) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid webhook token.' });
      }
    }

    const payload = req.body || {};
    const result = await workflowEngine.executeWorkflow(id, 'webhook_event', payload);
    res.json({
      success: true,
      executionId: result.executionId,
      status: result.status,
      logs: result.logs,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/workflows/:id/toggle - Toggle isActive status
router.post('/:id/toggle', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const workflow = await db.query.workflows.findFirst({
      where: eq(schema.workflows.id, id),
    });

    if (!workflow) {
      return res.status(404).json({ error: 'NotFound', message: 'Workflow not found.' });
    }

    const nextActive = !workflow.isActive;
    const [updated] = await db.update(schema.workflows)
      .set({
        isActive: nextActive,
        updatedAt: new Date(),
      })
      .where(eq(schema.workflows.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/workflows/cron-preview - Validate & preview cron occurrences in Asia/Kolkata
router.post('/cron-preview', authenticate, async (req, res, next) => {
  try {
    const { cronExpression, timezone = 'Asia/Kolkata', count = 5 } = req.body;
    const { validateAndExplainCron } = await import('../utils/cron-helpers.js');
    const result = validateAndExplainCron(cronExpression, timezone, count);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/workflows/executions/:executionId/retry - Retry a failed execution
router.post('/executions/:executionId/retry', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { executionId } = req.params;
    const execution = await db.query.workflowExecutions.findFirst({
      where: eq(schema.workflowExecutions.id, executionId),
    });

    if (!execution) {
      return res.status(404).json({ error: 'NotFound', message: 'Execution record not found.' });
    }

    const result = await workflowEngine.executeWorkflow(
      execution.workflowId,
      `retry_of_${executionId.slice(0, 8)}`
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/workflows/executions/:executionId - Fetch live details of single execution
router.get('/executions/:executionId', authenticate, async (req, res, next) => {
  try {
    const { executionId } = req.params;
    const execution = await db.query.workflowExecutions.findFirst({
      where: eq(schema.workflowExecutions.id, executionId),
    });
    if (!execution) {
      return res.status(404).json({ error: 'NotFound', message: 'Execution record not found.' });
    }
    res.json(execution);
  } catch (err) {
    next(err);
  }
});

// GET /api/workflows/:id/executions - List execution history
router.get('/:id/executions', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const executions = await db.query.workflowExecutions.findMany({
      where: eq(schema.workflowExecutions.workflowId, id),
      orderBy: [desc(schema.workflowExecutions.startedAt)],
      limit: 50,
    });
    res.json(executions);
  } catch (err) {
    next(err);
  }
});

export default router;
