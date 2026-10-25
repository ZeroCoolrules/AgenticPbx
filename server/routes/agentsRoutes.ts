import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth } from '../auth.ts';

const router = Router();

// GET /api/agents
router.get('/', (req: Request, res: Response) => {
  res.json(db.getAgents());
});

// GET /api/agents/:id
router.get('/:id', (req: Request, res: Response) => {
  const agent = db.getAgentById(req.params.id);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  res.json(agent);
});

// PUT /api/agents/:id
router.put('/:id', requireAuth, (req: Request, res: Response) => {
  const updated = db.updateAgent(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  db.logAction('AGENT_UPDATED', undefined, `Updated AI Agent ${updated.name} configuration`);
  res.json(updated);
});

export default router;
