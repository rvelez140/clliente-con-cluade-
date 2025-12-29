import { Request, Response } from 'express';
import { labelsService } from '../services/labels.service';
import { filtersService } from '../services/filters.service';
import { contactsService } from '../services/contacts.service';
import { snoozeService } from '../services/snooze.service';
import { undoSendService } from '../services/undo-send.service';
import { confidentialService } from '../services/confidential.service';
import { readReceiptsService } from '../services/read-receipts.service';
import { nudgesService } from '../services/nudges.service';
import { tasksService } from '../services/tasks.service';
import { calendarService } from '../services/calendar.service';
import { advancedSearchService } from '../services/advanced-search.service';
import { analyticsService } from '../services/analytics.service';
import { keyboardShortcutsService } from '../services/keyboard-shortcuts.service';
import logger from '../config/logger';

// ==================== LABELS ====================
export const getLabels = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const includeSystem = req.query.includeSystem !== 'false';
    const labels = await labelsService.getLabels(userId, includeSystem);
    res.json({ success: true, data: labels });
  } catch (error: any) {
    logger.error('Error getting labels:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createLabel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const label = await labelsService.createLabel(userId, req.body);
    res.status(201).json({ success: true, data: label });
  } catch (error: any) {
    logger.error('Error creating label:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateLabel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const label = await labelsService.updateLabel(userId, req.params.id, req.body);
    if (!label) {
      return res.status(404).json({ success: false, error: 'Label not found' });
    }
    res.json({ success: true, data: label });
  } catch (error: any) {
    logger.error('Error updating label:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteLabel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const deleted = await labelsService.deleteLabel(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Label not found' });
    }
    res.json({ success: true, message: 'Label deleted' });
  } catch (error: any) {
    logger.error('Error deleting label:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const applyLabelToEmail = async (req: Request, res: Response) => {
  try {
    const { emailId, labelId } = req.body;
    await labelsService.applyLabel(emailId, labelId);
    res.json({ success: true, message: 'Label applied' });
  } catch (error: any) {
    logger.error('Error applying label:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeLabelFromEmail = async (req: Request, res: Response) => {
  try {
    const { emailId, labelId } = req.body;
    await labelsService.removeLabel(emailId, labelId);
    res.json({ success: true, message: 'Label removed' });
  } catch (error: any) {
    logger.error('Error removing label:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== FILTERS ====================
export const getFilters = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const filters = await filtersService.getFilters(userId);
    res.json({ success: true, data: filters });
  } catch (error: any) {
    logger.error('Error getting filters:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createFilter = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const filter = await filtersService.createFilter(userId, req.body);
    res.status(201).json({ success: true, data: filter });
  } catch (error: any) {
    logger.error('Error creating filter:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateFilter = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const filter = await filtersService.updateFilter(userId, req.params.id, req.body);
    if (!filter) {
      return res.status(404).json({ success: false, error: 'Filter not found' });
    }
    res.json({ success: true, data: filter });
  } catch (error: any) {
    logger.error('Error updating filter:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteFilter = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const deleted = await filtersService.deleteFilter(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Filter not found' });
    }
    res.json({ success: true, message: 'Filter deleted' });
  } catch (error: any) {
    logger.error('Error deleting filter:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== CONTACTS ====================
export const getContacts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await contactsService.getContacts(userId, {
      search: req.query.search as string,
      starred: req.query.starred === 'true',
      groupId: req.query.groupId as string,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0
    });
    res.json({ success: true, data: result.contacts, total: result.total });
  } catch (error: any) {
    logger.error('Error getting contacts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createContact = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const contact = await contactsService.createContact(userId, req.body);
    res.status(201).json({ success: true, data: contact });
  } catch (error: any) {
    logger.error('Error creating contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateContact = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const contact = await contactsService.updateContact(userId, req.params.id, req.body);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, data: contact });
  } catch (error: any) {
    logger.error('Error updating contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteContact = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const deleted = await contactsService.deleteContact(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error: any) {
    logger.error('Error deleting contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getContactGroups = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const groups = await contactsService.getGroups(userId);
    res.json({ success: true, data: groups });
  } catch (error: any) {
    logger.error('Error getting contact groups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const searchContacts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const contacts = await contactsService.searchContacts(userId, req.query.q as string);
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    logger.error('Error searching contacts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SNOOZE ====================
export const snoozeEmail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const snoozed = await snoozeService.snoozeEmail(userId, req.body.emailId, {
      type: req.body.type,
      customDateTime: req.body.customDateTime,
      timezone: req.body.timezone
    });
    res.json({ success: true, data: snoozed });
  } catch (error: any) {
    logger.error('Error snoozing email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const unsnoozeEmail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const unsnoozed = await snoozeService.unsnoozeEmail(userId, req.params.emailId);
    if (!unsnoozed) {
      return res.status(404).json({ success: false, error: 'Snoozed email not found' });
    }
    res.json({ success: true, message: 'Email unsnoozed' });
  } catch (error: any) {
    logger.error('Error unsnoozing email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSnoozedEmails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const snoozed = await snoozeService.getSnoozedEmails(userId);
    res.json({ success: true, data: snoozed });
  } catch (error: any) {
    logger.error('Error getting snoozed emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== UNDO SEND ====================
export const queueEmail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const pending = await undoSendService.queueEmail(userId, req.body.accountId, {
      to: req.body.to,
      cc: req.body.cc,
      bcc: req.body.bcc,
      subject: req.body.subject,
      body: req.body.body,
      htmlBody: req.body.htmlBody,
      undoPeriodSeconds: req.body.undoPeriodSeconds
    });
    res.json({ success: true, data: pending });
  } catch (error: any) {
    logger.error('Error queuing email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const undoSend = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const undone = await undoSendService.undoSend(userId, req.params.id);
    if (!undone) {
      return res.status(400).json({ success: false, error: 'Cannot undo send - time expired or already sent' });
    }
    res.json({ success: true, message: 'Send undone' });
  } catch (error: any) {
    logger.error('Error undoing send:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPendingEmails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const pending = await undoSendService.getPendingEmails(userId);
    res.json({ success: true, data: pending });
  } catch (error: any) {
    logger.error('Error getting pending emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== CONFIDENTIAL ====================
export const createConfidentialEmail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const conf = await confidentialService.createConfidentialEmail(userId, req.body.emailId, req.body.settings);
    res.status(201).json({ success: true, data: conf });
  } catch (error: any) {
    logger.error('Error creating confidential email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const accessConfidentialEmail = async (req: Request, res: Response) => {
  try {
    const result = await confidentialService.accessEmail(req.params.id, {
      passcode: req.body.passcode,
      smsCode: req.body.smsCode,
      accessedBy: req.body.accessedBy || 'anonymous',
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error accessing confidential email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const revokeConfidentialAccess = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const revoked = await confidentialService.revokeAccess(userId, req.params.id);
    if (!revoked) {
      return res.status(404).json({ success: false, error: 'Confidential email not found' });
    }
    res.json({ success: true, message: 'Access revoked' });
  } catch (error: any) {
    logger.error('Error revoking access:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== READ RECEIPTS ====================
export const createReadReceipt = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const receipt = await readReceiptsService.createReadReceipt(userId, req.body.emailId, req.body.recipientEmail);
    res.status(201).json({ success: true, data: receipt });
  } catch (error: any) {
    logger.error('Error creating read receipt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const trackPixel = async (req: Request, res: Response) => {
  try {
    const trackingId = req.params.trackingId.replace('.gif', '');
    await readReceiptsService.trackPixelLoad(
      trackingId,
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );
    const pixel = await readReceiptsService.getTrackingPixel();
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(pixel);
  } catch (error: any) {
    logger.error('Error tracking pixel:', error);
    res.status(200).send(); // Still return 200 to not break email clients
  }
};

export const getReadReceipts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await readReceiptsService.getUserReceipts(userId, {
      onlyRead: req.query.onlyRead === 'true',
      onlyUnread: req.query.onlyUnread === 'true'
    });
    res.json({ success: true, data: result.receipts, total: result.total });
  } catch (error: any) {
    logger.error('Error getting read receipts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== NUDGES ====================
export const getNudges = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const nudges = await nudgesService.getActiveNudges(userId);
    res.json({ success: true, data: nudges });
  } catch (error: any) {
    logger.error('Error getting nudges:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const dismissNudge = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const dismissed = await nudgesService.dismissNudge(userId, req.params.id);
    if (!dismissed) {
      return res.status(404).json({ success: false, error: 'Nudge not found' });
    }
    res.json({ success: true, message: 'Nudge dismissed' });
  } catch (error: any) {
    logger.error('Error dismissing nudge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== TASKS ====================
export const getTaskLists = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const lists = await tasksService.getLists(userId);
    res.json({ success: true, data: lists });
  } catch (error: any) {
    logger.error('Error getting task lists:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createTaskList = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const list = await tasksService.createList(userId, req.body.name, req.body.color);
    res.status(201).json({ success: true, data: list });
  } catch (error: any) {
    logger.error('Error creating task list:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await tasksService.getTasks(userId, {
      listId: req.query.listId as string,
      status: req.query.status as any,
      overdue: req.query.overdue === 'true'
    });
    res.json({ success: true, data: result.tasks, total: result.total });
  } catch (error: any) {
    logger.error('Error getting tasks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const task = await tasksService.createTask(userId, req.body);
    res.status(201).json({ success: true, data: task });
  } catch (error: any) {
    logger.error('Error creating task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const task = await tasksService.updateTask(userId, req.params.id, req.body);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error: any) {
    logger.error('Error updating task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const completeTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const task = await tasksService.completeTask(userId, req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error: any) {
    logger.error('Error completing task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const deleted = await tasksService.deleteTask(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted' });
  } catch (error: any) {
    logger.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== CALENDAR ====================
export const getCalendars = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const calendars = await calendarService.getCalendars(userId);
    res.json({ success: true, data: calendars });
  } catch (error: any) {
    logger.error('Error getting calendars:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createCalendar = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const calendar = await calendarService.createCalendar(userId, req.body.name, req.body);
    res.status(201).json({ success: true, data: calendar });
  } catch (error: any) {
    logger.error('Error creating calendar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await calendarService.getEvents(userId, {
      calendarId: req.query.calendarId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    });
    res.json({ success: true, data: result.events, total: result.total });
  } catch (error: any) {
    logger.error('Error getting events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const event = await calendarService.createEvent(userId, req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    logger.error('Error creating event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const event = await calendarService.updateEvent(userId, req.params.id, req.body);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (error: any) {
    logger.error('Error updating event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const deleted = await calendarService.deleteEvent(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, message: 'Event deleted' });
  } catch (error: any) {
    logger.error('Error deleting event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SEARCH ====================
export const advancedSearch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await advancedSearchService.search(userId, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error in advanced search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const parseSearchQuery = async (req: Request, res: Response) => {
  try {
    const parsed = await advancedSearchService.parseNaturalLanguageQuery(req.body.query);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    logger.error('Error parsing search query:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSavedSearches = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const searches = await advancedSearchService.getSavedSearches(userId);
    res.json({ success: true, data: searches });
  } catch (error: any) {
    logger.error('Error getting saved searches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const saveSearch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const saved = await advancedSearchService.saveSearch(userId, req.body.name, req.body.query, req.body.description);
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    logger.error('Error saving search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== ANALYTICS ====================
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const analytics = await analyticsService.getDailyAnalytics(
      userId,
      req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      req.query.endDate as string || new Date().toISOString().split('T')[0]
    );
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getProductivityInsights = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const insights = await analyticsService.getProductivityInsights(userId);
    res.json({ success: true, data: insights });
  } catch (error: any) {
    logger.error('Error getting productivity insights:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getEmailHeatmap = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const heatmap = await analyticsService.getEmailHeatmap(userId);
    res.json({ success: true, data: heatmap });
  } catch (error: any) {
    logger.error('Error getting email heatmap:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== KEYBOARD SHORTCUTS ====================
export const getKeyboardShortcuts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const shortcuts = await keyboardShortcutsService.getShortcutsByCategory(userId);
    res.json({ success: true, data: shortcuts });
  } catch (error: any) {
    logger.error('Error getting keyboard shortcuts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateKeyboardShortcut = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const shortcut = await keyboardShortcutsService.updateShortcut(userId, req.params.actionId, req.body);
    if (!shortcut) {
      return res.status(404).json({ success: false, error: 'Shortcut not found' });
    }
    res.json({ success: true, data: shortcut });
  } catch (error: any) {
    logger.error('Error updating keyboard shortcut:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const resetKeyboardShortcuts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await keyboardShortcutsService.resetToDefaults(userId);
    res.json({ success: true, message: 'Shortcuts reset to defaults' });
  } catch (error: any) {
    logger.error('Error resetting keyboard shortcuts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
