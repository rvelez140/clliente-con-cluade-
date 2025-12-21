import { Request, Response } from 'express';
import aiClassifierService from '../services/ai-classifier.service';
import smartSearchService from '../services/smart-search.service';
import { Email } from '../types';

export class AIController {
  async classifyEmail(req: Request, res: Response) {
    try {
      const email: Email = req.body.email;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const classification = await aiClassifierService.classifyEmail(email);
      res.json(classification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async detectSpam(req: Request, res: Response) {
    try {
      const email: Email = req.body.email;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const analysis = await aiClassifierService.detectSpamAndPhishing(email);
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async calculatePriority(req: Request, res: Response) {
    try {
      const email: Email = req.body.email;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const priority = await aiClassifierService.calculatePriority(email);
      res.json(priority);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async extractActionItems(req: Request, res: Response) {
    try {
      const email: Email = req.body.email;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const actions = await aiClassifierService.extractActionItems(email);
      res.json({ actions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async suggestQuickReplies(req: Request, res: Response) {
    try {
      const email: Email = req.body.email;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const replies = await aiClassifierService.suggestQuickReplies(email);
      res.json({ replies });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async smartSearch(req: Request, res: Response) {
    try {
      const { query, emails } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      if (!emails || !Array.isArray(emails)) {
        return res.status(400).json({ error: 'Emails array is required' });
      }

      const results = await smartSearchService.semanticSearch(emails, query);
      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async parseSearchQuery(req: Request, res: Response) {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const parsed = await smartSearchService.parseNaturalLanguageQuery(query);
      res.json(parsed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async findSimilarEmails(req: Request, res: Response) {
    try {
      const { email, allEmails } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      if (!allEmails || !Array.isArray(allEmails)) {
        return res.status(400).json({ error: 'All emails array is required' });
      }

      const similar = await smartSearchService.findSimilarEmails(email, allEmails);
      res.json({ similar });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async batchClassify(req: Request, res: Response) {
    try {
      const { emails } = req.body;

      if (!emails || !Array.isArray(emails)) {
        return res.status(400).json({ error: 'Emails array is required' });
      }

      const results = await aiClassifierService.analyzeEmailBatch(emails);
      const resultsObj = Object.fromEntries(results);

      res.json({ classifications: resultsObj });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AIController();
