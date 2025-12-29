import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as outlookController from '../controllers/outlook-features.controller';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// ==================== FOCUSED INBOX ====================
router.get('/focused-inbox', outlookController.getFocusedInbox);
router.post('/focused-inbox/train', outlookController.trainFocusedInbox);
router.get('/focused-inbox/settings', outlookController.getFocusedInboxSettings);
router.put('/focused-inbox/settings', outlookController.updateFocusedInboxSettings);

// ==================== QUICK STEPS ====================
router.get('/quick-steps', outlookController.getQuickSteps);
router.post('/quick-steps', outlookController.createQuickStep);
router.post('/quick-steps/:quickStepId/execute', outlookController.executeQuickStep);
router.put('/quick-steps/:quickStepId', outlookController.updateQuickStep);
router.delete('/quick-steps/:quickStepId', outlookController.deleteQuickStep);

// ==================== SWEEP ====================
router.get('/sweep/rules', outlookController.getSweepRules);
router.post('/sweep/rules', outlookController.createSweepRule);
router.post('/sweep/execute', outlookController.executeSweep);
router.delete('/sweep/rules/:ruleId', outlookController.deleteSweepRule);

// ==================== MENTIONS ====================
router.get('/mentions', outlookController.getMentions);
router.get('/mentions/suggestions', outlookController.getMentionSuggestions);
router.get('/mentions/stats', outlookController.getMentionStats);
router.post('/mentions/:mentionId/read', outlookController.markMentionAsRead);
router.post('/mentions/read-all', outlookController.markAllMentionsAsRead);

// ==================== VOTING / POLLS ====================
router.get('/polls', outlookController.getUserPolls);
router.post('/polls', outlookController.createPoll);
router.get('/polls/:pollId', outlookController.getPoll);
router.get('/polls/:pollId/results', outlookController.getPollResults);
router.post('/polls/:pollId/vote', outlookController.vote);
router.post('/polls/:pollId/close', outlookController.closePoll);

// ==================== FOLLOW-UP FLAGS ====================
router.get('/flags', outlookController.getFlags);
router.get('/flags/stats', outlookController.getFlagStats);
router.post('/flags', outlookController.createFlag);
router.post('/flags/quick', outlookController.quickFlag);
router.put('/flags/:flagId', outlookController.updateFlag);
router.post('/flags/:flagId/complete', outlookController.completeFlag);
router.delete('/flags/email/:emailId', outlookController.clearFlag);

// ==================== CATEGORIES ====================
router.get('/categories', outlookController.getCategories);
router.get('/categories/colors', outlookController.getAvailableColors);
router.post('/categories', outlookController.createCategory);
router.put('/categories/:categoryId', outlookController.updateCategory);
router.delete('/categories/:categoryId', outlookController.deleteCategory);
router.get('/categories/:categoryId/emails', outlookController.getEmailsByCategory);
router.post('/categories/assign', outlookController.assignCategory);
router.delete('/categories/:categoryId/emails/:emailId', outlookController.removeCategory);

// ==================== QUICK PARTS ====================
router.get('/quick-parts', outlookController.getQuickParts);
router.post('/quick-parts', outlookController.createQuickPart);
router.put('/quick-parts/:partId', outlookController.updateQuickPart);
router.delete('/quick-parts/:partId', outlookController.deleteQuickPart);
router.post('/quick-parts/:partId/use', outlookController.useQuickPart);
router.get('/quick-parts/export', outlookController.exportQuickParts);
router.post('/quick-parts/import', outlookController.importQuickParts);

// AutoText
router.get('/auto-text', outlookController.getAutoTexts);
router.post('/auto-text', outlookController.createAutoText);
router.post('/auto-text/expand', outlookController.expandAutoText);

// ==================== RESOURCES ====================
router.get('/resources', outlookController.getResources);
router.post('/resources', outlookController.createResource);
router.get('/resources/:resourceId', outlookController.getResource);
router.get('/resources/:resourceId/availability', outlookController.getResourceAvailability);
router.post('/resources/find-available', outlookController.findAvailableResources);

// Bookings
router.get('/bookings', outlookController.getUserBookings);
router.post('/bookings', outlookController.createBooking);
router.delete('/bookings/:bookingId', outlookController.cancelBooking);

// ==================== DICTATION ====================
router.post('/dictation/start', outlookController.startDictation);
router.post('/dictation/:sessionId/append', outlookController.appendDictation);
router.post('/dictation/:sessionId/pause', outlookController.pauseDictation);
router.post('/dictation/:sessionId/resume', outlookController.resumeDictation);
router.post('/dictation/:sessionId/complete', outlookController.completeDictation);
router.get('/dictation/history', outlookController.getDictationHistory);
router.get('/dictation/commands', outlookController.getVoiceCommands);
router.get('/dictation/languages', outlookController.getSupportedLanguages);
router.get('/dictation/stats', outlookController.getDictationStats);

// ==================== IMMERSIVE READER ====================
router.get('/immersive-reader/settings', outlookController.getImmersiveReaderSettings);
router.put('/immersive-reader/settings', outlookController.updateImmersiveReaderSettings);
router.get('/immersive-reader/options', outlookController.getImmersiveReaderOptions);
router.post('/immersive-reader/process', outlookController.processTextForReading);
router.post('/immersive-reader/translate', outlookController.translateText);
router.post('/immersive-reader/speech', outlookController.prepareTextForSpeech);
router.post('/immersive-reader/:sessionId/complete', outlookController.completeReadingSession);
router.get('/immersive-reader/stats', outlookController.getReadingStats);

export default router;
