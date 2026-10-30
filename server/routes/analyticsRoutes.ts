import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { generateAnalyticsDataset } from '../../src/lib/analytics.ts';

const router = Router();

// GET /api/analytics
router.get('/', (req: Request, res: Response) => {
  try {
    const daysParam = parseInt(req.query.days as string, 10);
    const days = [7, 14, 30, 90].includes(daysParam) ? daysParam : 14;

    const calls = db.getCalls();
    const leads = db.getLeads();
    const agents = db.getAgents();

    const data = generateAnalyticsDataset(days, calls, leads, agents);

    // If specific agent filtered, we can tailor the agent performance
    const agentId = req.query.agentId as string;
    if (agentId && agentId !== 'all') {
      data.agentPerformance = data.agentPerformance.filter(a => a.agentId === agentId);
    }

    res.json(data);
  } catch (err: any) {
    console.error('[Analytics] Error generating analytics payload:', err);
    res.status(500).json({ error: 'Failed to generate analytics data.' });
  }
});

export default router;
