import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as controller from '../controllers/gmail-features.controller';

const router = Router();

// ==================== LABELS ====================
router.get('/labels', authMiddleware, controller.getLabels);
router.post('/labels', authMiddleware, controller.createLabel);
router.put('/labels/:id', authMiddleware, controller.updateLabel);
router.delete('/labels/:id', authMiddleware, controller.deleteLabel);
router.post('/labels/apply', authMiddleware, controller.applyLabelToEmail);
router.post('/labels/remove', authMiddleware, controller.removeLabelFromEmail);

// ==================== FILTERS ====================
router.get('/filters', authMiddleware, controller.getFilters);
router.post('/filters', authMiddleware, controller.createFilter);
router.put('/filters/:id', authMiddleware, controller.updateFilter);
router.delete('/filters/:id', authMiddleware, controller.deleteFilter);

// ==================== CONTACTS ====================
router.get('/contacts', authMiddleware, controller.getContacts);
router.get('/contacts/search', authMiddleware, controller.searchContacts);
router.post('/contacts', authMiddleware, controller.createContact);
router.put('/contacts/:id', authMiddleware, controller.updateContact);
router.delete('/contacts/:id', authMiddleware, controller.deleteContact);
router.get('/contacts/groups', authMiddleware, controller.getContactGroups);

// ==================== SNOOZE ====================
router.get('/snooze', authMiddleware, controller.getSnoozedEmails);
router.post('/snooze', authMiddleware, controller.snoozeEmail);
router.delete('/snooze/:emailId', authMiddleware, controller.unsnoozeEmail);

// ==================== UNDO SEND ====================
router.get('/pending-emails', authMiddleware, controller.getPendingEmails);
router.post('/send', authMiddleware, controller.queueEmail);
router.post('/undo-send/:id', authMiddleware, controller.undoSend);

// ==================== CONFIDENTIAL MODE ====================
router.post('/confidential', authMiddleware, controller.createConfidentialEmail);
router.post('/confidential/:id/access', controller.accessConfidentialEmail); // No auth - accessed by recipient
router.post('/confidential/:id/revoke', authMiddleware, controller.revokeConfidentialAccess);

// ==================== READ RECEIPTS ====================
router.get('/read-receipts', authMiddleware, controller.getReadReceipts);
router.post('/read-receipts', authMiddleware, controller.createReadReceipt);
router.get('/tracking/pixel/:trackingId', controller.trackPixel); // No auth - tracking pixel

// ==================== NUDGES ====================
router.get('/nudges', authMiddleware, controller.getNudges);
router.post('/nudges/:id/dismiss', authMiddleware, controller.dismissNudge);

// ==================== TASKS ====================
router.get('/tasks/lists', authMiddleware, controller.getTaskLists);
router.post('/tasks/lists', authMiddleware, controller.createTaskList);
router.get('/tasks', authMiddleware, controller.getTasks);
router.post('/tasks', authMiddleware, controller.createTask);
router.put('/tasks/:id', authMiddleware, controller.updateTask);
router.post('/tasks/:id/complete', authMiddleware, controller.completeTask);
router.delete('/tasks/:id', authMiddleware, controller.deleteTask);

// ==================== CALENDAR ====================
router.get('/calendars', authMiddleware, controller.getCalendars);
router.post('/calendars', authMiddleware, controller.createCalendar);
router.get('/events', authMiddleware, controller.getEvents);
router.post('/events', authMiddleware, controller.createEvent);
router.put('/events/:id', authMiddleware, controller.updateEvent);
router.delete('/events/:id', authMiddleware, controller.deleteEvent);

// ==================== SEARCH ====================
router.post('/search', authMiddleware, controller.advancedSearch);
router.post('/search/parse', authMiddleware, controller.parseSearchQuery);
router.get('/search/saved', authMiddleware, controller.getSavedSearches);
router.post('/search/saved', authMiddleware, controller.saveSearch);

// ==================== ANALYTICS ====================
router.get('/analytics', authMiddleware, controller.getAnalytics);
router.get('/analytics/insights', authMiddleware, controller.getProductivityInsights);
router.get('/analytics/heatmap', authMiddleware, controller.getEmailHeatmap);

// ==================== KEYBOARD SHORTCUTS ====================
router.get('/shortcuts', authMiddleware, controller.getKeyboardShortcuts);
router.put('/shortcuts/:actionId', authMiddleware, controller.updateKeyboardShortcut);
router.post('/shortcuts/reset', authMiddleware, controller.resetKeyboardShortcuts);

export default router;
