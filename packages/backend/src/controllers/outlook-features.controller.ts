import { Request, Response } from 'express';
import { focusedInboxService } from '../services/focused-inbox.service';
import { quickStepsService } from '../services/quick-steps.service';
import { sweepService } from '../services/sweep.service';
import { mentionsService } from '../services/mentions.service';
import { votingService } from '../services/voting.service';
import { followUpFlagsService } from '../services/follow-up-flags.service';
import { outlookCategoriesService } from '../services/outlook-categories.service';
import { quickPartsService } from '../services/quick-parts.service';
import { resourcesService } from '../services/resources.service';
import { dictationService } from '../services/dictation.service';
import { immersiveReaderService } from '../services/immersive-reader.service';
import logger from '../config/logger';

// ==================== FOCUSED INBOX ====================

export const getFocusedInbox = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { type = 'focused', limit, offset } = req.query;

    const result = await focusedInboxService.getInbox(userId, {
      type: type as 'focused' | 'other',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json(result);
  } catch (error) {
    logger.error('Error getting focused inbox:', error);
    res.status(500).json({ error: 'Failed to get focused inbox' });
  }
};

export const trainFocusedInbox = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { emailId, isFocused } = req.body;

    await focusedInboxService.trainClassification(userId, emailId, isFocused);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error training focused inbox:', error);
    res.status(500).json({ error: 'Failed to train classification' });
  }
};

export const getFocusedInboxSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const settings = await focusedInboxService.getSettings(userId);
    res.json(settings);
  } catch (error) {
    logger.error('Error getting focused inbox settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

export const updateFocusedInboxSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const settings = await focusedInboxService.updateSettings(userId, req.body);
    res.json(settings);
  } catch (error) {
    logger.error('Error updating focused inbox settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// ==================== QUICK STEPS ====================

export const getQuickSteps = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const quickSteps = await quickStepsService.getQuickSteps(userId);
    res.json(quickSteps);
  } catch (error) {
    logger.error('Error getting quick steps:', error);
    res.status(500).json({ error: 'Failed to get quick steps' });
  }
};

export const createQuickStep = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const quickStep = await quickStepsService.createQuickStep(userId, req.body);
    res.status(201).json(quickStep);
  } catch (error) {
    logger.error('Error creating quick step:', error);
    res.status(500).json({ error: 'Failed to create quick step' });
  }
};

export const executeQuickStep = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { quickStepId } = req.params;
    const { emailIds } = req.body;

    const results = await quickStepsService.executeQuickStep(userId, quickStepId, emailIds);
    res.json(results);
  } catch (error) {
    logger.error('Error executing quick step:', error);
    res.status(500).json({ error: 'Failed to execute quick step' });
  }
};

export const updateQuickStep = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { quickStepId } = req.params;
    const quickStep = await quickStepsService.updateQuickStep(userId, quickStepId, req.body);

    if (!quickStep) {
      return res.status(404).json({ error: 'Quick step not found' });
    }
    res.json(quickStep);
  } catch (error) {
    logger.error('Error updating quick step:', error);
    res.status(500).json({ error: 'Failed to update quick step' });
  }
};

export const deleteQuickStep = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { quickStepId } = req.params;
    const deleted = await quickStepsService.deleteQuickStep(userId, quickStepId);

    if (!deleted) {
      return res.status(404).json({ error: 'Quick step not found' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting quick step:', error);
    res.status(500).json({ error: 'Failed to delete quick step' });
  }
};

// ==================== SWEEP ====================

export const getSweepRules = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const rules = await sweepService.getSweepRules(userId);
    res.json(rules);
  } catch (error) {
    logger.error('Error getting sweep rules:', error);
    res.status(500).json({ error: 'Failed to get sweep rules' });
  }
};

export const createSweepRule = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const rule = await sweepService.createSweepRule(userId, req.body);
    res.status(201).json(rule);
  } catch (error) {
    logger.error('Error creating sweep rule:', error);
    res.status(500).json({ error: 'Failed to create sweep rule' });
  }
};

export const executeSweep = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { sender, action } = req.body;

    const result = await sweepService.sweep(userId, sender, action);
    res.json(result);
  } catch (error) {
    logger.error('Error executing sweep:', error);
    res.status(500).json({ error: 'Failed to execute sweep' });
  }
};

export const deleteSweepRule = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { ruleId } = req.params;
    const deleted = await sweepService.deleteSweepRule(userId, ruleId);

    if (!deleted) {
      return res.status(404).json({ error: 'Sweep rule not found' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting sweep rule:', error);
    res.status(500).json({ error: 'Failed to delete sweep rule' });
  }
};

// ==================== MENTIONS ====================

export const getMentions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { unreadOnly } = req.query;

    const mentions = await mentionsService.getMentionsForUser(
      userId,
      unreadOnly === 'true'
    );
    res.json(mentions);
  } catch (error) {
    logger.error('Error getting mentions:', error);
    res.status(500).json({ error: 'Failed to get mentions' });
  }
};

export const getMentionSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { query } = req.query;

    const suggestions = await mentionsService.getSuggestionsForMention(
      userId,
      query as string
    );
    res.json(suggestions);
  } catch (error) {
    logger.error('Error getting mention suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

export const markMentionAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { mentionId } = req.params;

    const success = await mentionsService.markMentionAsRead(userId, mentionId);
    res.json({ success });
  } catch (error) {
    logger.error('Error marking mention as read:', error);
    res.status(500).json({ error: 'Failed to mark mention as read' });
  }
};

export const markAllMentionsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const count = await mentionsService.markAllMentionsAsRead(userId);
    res.json({ markedCount: count });
  } catch (error) {
    logger.error('Error marking all mentions as read:', error);
    res.status(500).json({ error: 'Failed to mark mentions as read' });
  }
};

export const getMentionStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const stats = await mentionsService.getStats(userId);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting mention stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// ==================== VOTING / POLLS ====================

export const createPoll = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { emailId, ...options } = req.body;

    const poll = await votingService.createPoll(userId, emailId, options);
    res.status(201).json(poll);
  } catch (error) {
    logger.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
};

export const getPoll = async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;
    const poll = await votingService.getPoll(pollId);

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    res.json(poll);
  } catch (error) {
    logger.error('Error getting poll:', error);
    res.status(500).json({ error: 'Failed to get poll' });
  }
};

export const vote = async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;
    const { selectedOptions, respondentEmail, respondentName, comment } = req.body;
    const userId = (req as any).userId;

    const response = await votingService.vote(pollId, respondentEmail, selectedOptions, {
      respondentName,
      respondentUserId: userId,
      comment
    });
    res.json(response);
  } catch (error: any) {
    logger.error('Error voting:', error);
    res.status(400).json({ error: error.message || 'Failed to vote' });
  }
};

export const getPollResults = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { pollId } = req.params;

    const results = await votingService.getResults(pollId, userId);
    if (!results) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    res.json(results);
  } catch (error: any) {
    logger.error('Error getting poll results:', error);
    res.status(400).json({ error: error.message || 'Failed to get results' });
  }
};

export const closePoll = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { pollId } = req.params;

    const poll = await votingService.closePoll(userId, pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    res.json(poll);
  } catch (error: any) {
    logger.error('Error closing poll:', error);
    res.status(400).json({ error: error.message || 'Failed to close poll' });
  }
};

export const getUserPolls = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const polls = await votingService.getUserPolls(userId);
    res.json(polls);
  } catch (error) {
    logger.error('Error getting user polls:', error);
    res.status(500).json({ error: 'Failed to get polls' });
  }
};

// ==================== FOLLOW-UP FLAGS ====================

export const createFlag = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const flag = await followUpFlagsService.createFlag(userId, req.body);
    res.status(201).json(flag);
  } catch (error) {
    logger.error('Error creating flag:', error);
    res.status(500).json({ error: 'Failed to create flag' });
  }
};

export const getFlags = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, priority, overdueOnly, dueTodayOnly, limit, offset } = req.query;

    const result = await followUpFlagsService.getUserFlags(userId, {
      status: status as any,
      priority: priority as any,
      overdueOnly: overdueOnly === 'true',
      dueTodayOnly: dueTodayOnly === 'true',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    res.json(result);
  } catch (error) {
    logger.error('Error getting flags:', error);
    res.status(500).json({ error: 'Failed to get flags' });
  }
};

export const quickFlag = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { emailId, quickType } = req.body;

    const flag = await followUpFlagsService.quickFlag(userId, emailId, quickType);
    res.status(201).json(flag);
  } catch (error) {
    logger.error('Error creating quick flag:', error);
    res.status(500).json({ error: 'Failed to create quick flag' });
  }
};

export const updateFlag = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { flagId } = req.params;

    const flag = await followUpFlagsService.updateFlag(userId, flagId, req.body);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    res.json(flag);
  } catch (error) {
    logger.error('Error updating flag:', error);
    res.status(500).json({ error: 'Failed to update flag' });
  }
};

export const completeFlag = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { flagId } = req.params;

    const flag = await followUpFlagsService.completeFlag(userId, flagId);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    res.json(flag);
  } catch (error) {
    logger.error('Error completing flag:', error);
    res.status(500).json({ error: 'Failed to complete flag' });
  }
};

export const clearFlag = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { emailId } = req.params;

    const deleted = await followUpFlagsService.clearFlag(userId, emailId);
    res.json({ success: deleted });
  } catch (error) {
    logger.error('Error clearing flag:', error);
    res.status(500).json({ error: 'Failed to clear flag' });
  }
};

export const getFlagStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const stats = await followUpFlagsService.getStats(userId);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting flag stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// ==================== CATEGORIES ====================

export const getCategories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const categories = await outlookCategoriesService.getCategories(userId);
    res.json(categories);
  } catch (error) {
    logger.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, color, shortcutKey } = req.body;

    const category = await outlookCategoriesService.createCategory(
      userId, name, color, shortcutKey
    );
    res.status(201).json(category);
  } catch (error: any) {
    logger.error('Error creating category:', error);
    res.status(400).json({ error: error.message || 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { categoryId } = req.params;

    const category = await outlookCategoriesService.updateCategory(
      userId, categoryId, req.body
    );
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error: any) {
    logger.error('Error updating category:', error);
    res.status(400).json({ error: error.message || 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { categoryId } = req.params;

    const deleted = await outlookCategoriesService.deleteCategory(userId, categoryId);
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

export const assignCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { emailId, categoryId } = req.body;

    const assignment = await outlookCategoriesService.assignCategoryToEmail(
      userId, emailId, categoryId
    );
    res.json(assignment);
  } catch (error: any) {
    logger.error('Error assigning category:', error);
    res.status(400).json({ error: error.message || 'Failed to assign category' });
  }
};

export const removeCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { emailId, categoryId } = req.params;

    const removed = await outlookCategoriesService.removeCategoryFromEmail(
      userId, emailId, categoryId
    );
    res.json({ success: removed });
  } catch (error) {
    logger.error('Error removing category:', error);
    res.status(500).json({ error: 'Failed to remove category' });
  }
};

export const getEmailsByCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { categoryId } = req.params;
    const { limit, offset } = req.query;

    const result = await outlookCategoriesService.getEmailsByCategory(userId, categoryId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting emails by category:', error);
    res.status(400).json({ error: error.message || 'Failed to get emails' });
  }
};

export const getAvailableColors = async (req: Request, res: Response) => {
  try {
    const colors = outlookCategoriesService.getAvailableColors();
    res.json(colors);
  } catch (error) {
    logger.error('Error getting available colors:', error);
    res.status(500).json({ error: 'Failed to get colors' });
  }
};

// ==================== QUICK PARTS ====================

export const getQuickParts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { category, contentType, galleryCategory, favoritesOnly, search } = req.query;

    const quickParts = await quickPartsService.getQuickParts(userId, {
      category: category as string,
      contentType: contentType as any,
      galleryCategory: galleryCategory as any,
      favoritesOnly: favoritesOnly === 'true',
      search: search as string
    });
    res.json(quickParts);
  } catch (error) {
    logger.error('Error getting quick parts:', error);
    res.status(500).json({ error: 'Failed to get quick parts' });
  }
};

export const createQuickPart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const quickPart = await quickPartsService.createQuickPart(userId, req.body);
    res.status(201).json(quickPart);
  } catch (error: any) {
    logger.error('Error creating quick part:', error);
    res.status(400).json({ error: error.message || 'Failed to create quick part' });
  }
};

export const updateQuickPart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { partId } = req.params;

    const quickPart = await quickPartsService.updateQuickPart(userId, partId, req.body);
    if (!quickPart) {
      return res.status(404).json({ error: 'Quick part not found' });
    }
    res.json(quickPart);
  } catch (error: any) {
    logger.error('Error updating quick part:', error);
    res.status(400).json({ error: error.message || 'Failed to update quick part' });
  }
};

export const deleteQuickPart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { partId } = req.params;

    const deleted = await quickPartsService.deleteQuickPart(userId, partId);
    if (!deleted) {
      return res.status(404).json({ error: 'Quick part not found' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting quick part:', error);
    res.status(500).json({ error: 'Failed to delete quick part' });
  }
};

export const useQuickPart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { partId } = req.params;

    const quickPart = await quickPartsService.useQuickPart(userId, partId);
    if (!quickPart) {
      return res.status(404).json({ error: 'Quick part not found' });
    }
    res.json(quickPart);
  } catch (error) {
    logger.error('Error using quick part:', error);
    res.status(500).json({ error: 'Failed to use quick part' });
  }
};

export const getAutoTexts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { activeOnly } = req.query;

    const autoTexts = await quickPartsService.getAutoTexts(
      userId,
      activeOnly !== 'false'
    );
    res.json(autoTexts);
  } catch (error) {
    logger.error('Error getting auto texts:', error);
    res.status(500).json({ error: 'Failed to get auto texts' });
  }
};

export const createAutoText = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const autoText = await quickPartsService.createAutoText(userId, req.body);
    res.status(201).json(autoText);
  } catch (error: any) {
    logger.error('Error creating auto text:', error);
    res.status(400).json({ error: error.message || 'Failed to create auto text' });
  }
};

export const expandAutoText = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { text } = req.body;

    const result = await quickPartsService.expandAutoText(userId, text);
    res.json(result);
  } catch (error) {
    logger.error('Error expanding auto text:', error);
    res.status(500).json({ error: 'Failed to expand auto text' });
  }
};

export const exportQuickParts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = await quickPartsService.exportQuickParts(userId);
    res.json(data);
  } catch (error) {
    logger.error('Error exporting quick parts:', error);
    res.status(500).json({ error: 'Failed to export' });
  }
};

export const importQuickParts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { data, overwrite } = req.body;

    const result = await quickPartsService.importQuickParts(userId, data, { overwrite });
    res.json(result);
  } catch (error) {
    logger.error('Error importing quick parts:', error);
    res.status(500).json({ error: 'Failed to import' });
  }
};

// ==================== RESOURCES ====================

export const getResources = async (req: Request, res: Response) => {
  try {
    const { resourceType, location, minCapacity, search } = req.query;

    const resources = await resourcesService.getResources({
      resourceType: resourceType as any,
      location: location as string,
      minCapacity: minCapacity ? parseInt(minCapacity as string) : undefined,
      search: search as string
    });
    res.json(resources);
  } catch (error) {
    logger.error('Error getting resources:', error);
    res.status(500).json({ error: 'Failed to get resources' });
  }
};

export const createResource = async (req: Request, res: Response) => {
  try {
    const resource = await resourcesService.createResource(req.body);
    res.status(201).json(resource);
  } catch (error) {
    logger.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
};

export const getResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const resource = await resourcesService.getResource(resourceId);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  } catch (error) {
    logger.error('Error getting resource:', error);
    res.status(500).json({ error: 'Failed to get resource' });
  }
};

export const getResourceAvailability = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { date } = req.query;

    const availability = await resourcesService.getAvailability(
      resourceId,
      new Date(date as string)
    );
    res.json(availability);
  } catch (error) {
    logger.error('Error getting availability:', error);
    res.status(500).json({ error: 'Failed to get availability' });
  }
};

export const findAvailableResources = async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, resourceType, minCapacity, amenities } = req.body;

    const resources = await resourcesService.findAvailableResources(
      new Date(startTime),
      new Date(endTime),
      {
        resourceType,
        minCapacity,
        amenities
      }
    );
    res.json(resources);
  } catch (error) {
    logger.error('Error finding available resources:', error);
    res.status(500).json({ error: 'Failed to find resources' });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const booking = await resourcesService.createBooking(userId, req.body);
    res.status(201).json(booking);
  } catch (error: any) {
    logger.error('Error creating booking:', error);
    res.status(400).json({ error: error.message || 'Failed to create booking' });
  }
};

export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { upcoming, status } = req.query;

    const bookings = await resourcesService.getUserBookings(userId, {
      upcoming: upcoming === 'true',
      status: status as any
    });
    res.json(bookings);
  } catch (error) {
    logger.error('Error getting user bookings:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { bookingId } = req.params;

    const booking = await resourcesService.cancelBooking(userId, bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error: any) {
    logger.error('Error cancelling booking:', error);
    res.status(400).json({ error: error.message || 'Failed to cancel booking' });
  }
};

// ==================== DICTATION ====================

export const startDictation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { language } = req.body;

    const session = await dictationService.startSession(userId, language);
    res.status(201).json(session);
  } catch (error) {
    logger.error('Error starting dictation:', error);
    res.status(500).json({ error: 'Failed to start dictation' });
  }
};

export const appendDictation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { text } = req.body;

    const session = await dictationService.appendText(sessionId, text);
    res.json(session);
  } catch (error: any) {
    logger.error('Error appending dictation:', error);
    res.status(400).json({ error: error.message || 'Failed to append text' });
  }
};

export const pauseDictation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await dictationService.pauseSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found or not active' });
    }
    res.json(session);
  } catch (error) {
    logger.error('Error pausing dictation:', error);
    res.status(500).json({ error: 'Failed to pause dictation' });
  }
};

export const resumeDictation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await dictationService.resumeSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found or not paused' });
    }
    res.json(session);
  } catch (error) {
    logger.error('Error resuming dictation:', error);
    res.status(500).json({ error: 'Failed to resume dictation' });
  }
};

export const completeDictation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await dictationService.completeSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    logger.error('Error completing dictation:', error);
    res.status(500).json({ error: 'Failed to complete dictation' });
  }
};

export const getDictationHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { limit, offset } = req.query;

    const result = await dictationService.getSessionHistory(userId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    res.json(result);
  } catch (error) {
    logger.error('Error getting dictation history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
};

export const getVoiceCommands = async (req: Request, res: Response) => {
  try {
    const { language } = req.query;
    const commands = dictationService.getVoiceCommands(language as string);
    res.json(commands);
  } catch (error) {
    logger.error('Error getting voice commands:', error);
    res.status(500).json({ error: 'Failed to get commands' });
  }
};

export const getSupportedLanguages = async (req: Request, res: Response) => {
  try {
    const languages = dictationService.getSupportedLanguages();
    res.json(languages);
  } catch (error) {
    logger.error('Error getting supported languages:', error);
    res.status(500).json({ error: 'Failed to get languages' });
  }
};

export const getDictationStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const stats = await dictationService.getStats(userId);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting dictation stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// ==================== IMMERSIVE READER ====================

export const getImmersiveReaderSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const settings = await immersiveReaderService.getSettings(userId);
    res.json(settings);
  } catch (error) {
    logger.error('Error getting immersive reader settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

export const updateImmersiveReaderSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const settings = await immersiveReaderService.updateSettings(userId, req.body);
    res.json(settings);
  } catch (error) {
    logger.error('Error updating immersive reader settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const processTextForReading = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { text, emailId, contentType } = req.body;

    const result = await immersiveReaderService.processTextForReading(userId, text, {
      emailId,
      contentType
    });
    res.json(result);
  } catch (error) {
    logger.error('Error processing text:', error);
    res.status(500).json({ error: 'Failed to process text' });
  }
};

export const translateText = async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;

    const translated = await immersiveReaderService.translateText(
      text,
      targetLanguage,
      sourceLanguage
    );
    res.json({ translated });
  } catch (error: any) {
    logger.error('Error translating text:', error);
    res.status(500).json({ error: error.message || 'Failed to translate' });
  }
};

export const prepareTextForSpeech = async (req: Request, res: Response) => {
  try {
    const { text, speed, language } = req.body;

    const result = await immersiveReaderService.prepareTextForSpeech(text, {
      speed,
      language
    });
    res.json(result);
  } catch (error) {
    logger.error('Error preparing text for speech:', error);
    res.status(500).json({ error: 'Failed to prepare text' });
  }
};

export const getImmersiveReaderOptions = async (req: Request, res: Response) => {
  try {
    const options = immersiveReaderService.getAvailableOptions();
    res.json(options);
  } catch (error) {
    logger.error('Error getting options:', error);
    res.status(500).json({ error: 'Failed to get options' });
  }
};

export const getReadingStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const stats = await immersiveReaderService.getStats(userId);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting reading stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

export const completeReadingSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await immersiveReaderService.completeSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    logger.error('Error completing reading session:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
};
