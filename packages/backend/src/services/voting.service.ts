import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface EmailPoll {
  id: string;
  email_id: string;
  creator_user_id: string;
  poll_type: 'single' | 'multiple' | 'yes_no' | 'approve_reject' | 'custom';
  options: string[];
  expires_at?: Date;
  is_closed: boolean;
  closed_at?: Date;
  allow_change_vote: boolean;
  show_results_before_close: boolean;
  require_comment: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PollResponse {
  id: string;
  poll_id: string;
  respondent_email: string;
  respondent_name?: string;
  respondent_user_id?: string;
  selected_options: string[];
  comment?: string;
  responded_at: Date;
  updated_at?: Date;
}

export interface PollResults {
  poll: EmailPoll;
  total_responses: number;
  option_counts: { option: string; count: number; percentage: number }[];
  responses: PollResponse[];
}

class VotingService {
  async createPoll(
    userId: string,
    emailId: string,
    options: {
      pollType?: EmailPoll['poll_type'];
      options?: string[];
      expiresAt?: string;
      allowChangeVote?: boolean;
      showResultsBeforeClose?: boolean;
      requireComment?: boolean;
    }
  ): Promise<EmailPoll> {
    const id = uuidv4();

    // Opciones predefinidas según el tipo
    let pollOptions: string[];
    switch (options.pollType) {
      case 'yes_no':
        pollOptions = ['Yes', 'No'];
        break;
      case 'approve_reject':
        pollOptions = ['Approve', 'Reject'];
        break;
      case 'custom':
      case 'single':
      case 'multiple':
      default:
        if (!options.options || options.options.length < 2) {
          throw new Error('At least 2 options are required for custom polls');
        }
        pollOptions = options.options;
    }

    const result = await pool.query(`
      INSERT INTO email_polls (
        id, email_id, creator_user_id, poll_type, options, expires_at,
        allow_change_vote, show_results_before_close, require_comment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      emailId,
      userId,
      options.pollType || 'single',
      JSON.stringify(pollOptions),
      options.expiresAt ? new Date(options.expiresAt) : null,
      options.allowChangeVote ?? true,
      options.showResultsBeforeClose ?? true,
      options.requireComment ?? false
    ]);

    logger.info(`Poll created for email ${emailId}: ${options.pollType}`);
    return result.rows[0];
  }

  async getPoll(pollId: string): Promise<EmailPoll | null> {
    const result = await pool.query(
      'SELECT * FROM email_polls WHERE id = $1',
      [pollId]
    );
    return result.rows[0] || null;
  }

  async getPollByEmail(emailId: string): Promise<EmailPoll | null> {
    const result = await pool.query(
      'SELECT * FROM email_polls WHERE email_id = $1',
      [emailId]
    );
    return result.rows[0] || null;
  }

  async vote(
    pollId: string,
    respondentEmail: string,
    selectedOptions: string[],
    options: {
      respondentName?: string;
      respondentUserId?: string;
      comment?: string;
    } = {}
  ): Promise<PollResponse> {
    const poll = await this.getPoll(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.is_closed) {
      throw new Error('Poll is closed');
    }

    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      throw new Error('Poll has expired');
    }

    // Validar opciones
    const pollOptions = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;
    for (const option of selectedOptions) {
      if (!pollOptions.includes(option)) {
        throw new Error(`Invalid option: ${option}`);
      }
    }

    // Validar tipo de poll
    if (poll.poll_type === 'single' && selectedOptions.length > 1) {
      throw new Error('Only one option can be selected for this poll');
    }

    if (poll.require_comment && !options.comment) {
      throw new Error('Comment is required');
    }

    // Verificar si ya votó
    const existing = await pool.query(
      'SELECT * FROM poll_responses WHERE poll_id = $1 AND respondent_email = $2',
      [pollId, respondentEmail]
    );

    if (existing.rows[0]) {
      if (!poll.allow_change_vote) {
        throw new Error('Vote cannot be changed');
      }

      // Actualizar voto existente
      const result = await pool.query(`
        UPDATE poll_responses
        SET selected_options = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
        WHERE poll_id = $3 AND respondent_email = $4
        RETURNING *
      `, [JSON.stringify(selectedOptions), options.comment, pollId, respondentEmail]);

      logger.info(`Vote updated for poll ${pollId} by ${respondentEmail}`);
      return result.rows[0];
    }

    // Nuevo voto
    const id = uuidv4();
    const result = await pool.query(`
      INSERT INTO poll_responses (
        id, poll_id, respondent_email, respondent_name, respondent_user_id,
        selected_options, comment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      id,
      pollId,
      respondentEmail,
      options.respondentName,
      options.respondentUserId,
      JSON.stringify(selectedOptions),
      options.comment
    ]);

    logger.info(`Vote recorded for poll ${pollId} by ${respondentEmail}`);
    return result.rows[0];
  }

  async getResults(pollId: string, userId?: string): Promise<PollResults | null> {
    const poll = await this.getPoll(pollId);
    if (!poll) return null;

    // Verificar si el usuario puede ver resultados
    if (!poll.is_closed && !poll.show_results_before_close && poll.creator_user_id !== userId) {
      throw new Error('Results are not available until poll is closed');
    }

    const responses = await pool.query(
      'SELECT * FROM poll_responses WHERE poll_id = $1 ORDER BY responded_at DESC',
      [pollId]
    );

    const totalResponses = responses.rows.length;
    const pollOptions = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;

    // Contar votos por opción
    const optionCounts: { option: string; count: number; percentage: number }[] = pollOptions.map((option: string) => {
      const count = responses.rows.filter(r => {
        const selected = typeof r.selected_options === 'string'
          ? JSON.parse(r.selected_options)
          : r.selected_options;
        return selected.includes(option);
      }).length;

      return {
        option,
        count,
        percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
      };
    });

    return {
      poll,
      total_responses: totalResponses,
      option_counts: optionCounts,
      responses: responses.rows
    };
  }

  async closePoll(userId: string, pollId: string): Promise<EmailPoll | null> {
    const poll = await this.getPoll(pollId);
    if (!poll) return null;

    if (poll.creator_user_id !== userId) {
      throw new Error('Only the poll creator can close the poll');
    }

    const result = await pool.query(`
      UPDATE email_polls
      SET is_closed = TRUE, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [pollId]);

    logger.info(`Poll ${pollId} closed by ${userId}`);
    return result.rows[0];
  }

  async deletePoll(userId: string, pollId: string): Promise<boolean> {
    const poll = await this.getPoll(pollId);
    if (!poll) return false;

    if (poll.creator_user_id !== userId) {
      throw new Error('Only the poll creator can delete the poll');
    }

    const result = await pool.query('DELETE FROM email_polls WHERE id = $1', [pollId]);
    return (result.rowCount ?? 0) > 0;
  }

  async getUserPolls(userId: string): Promise<EmailPoll[]> {
    const result = await pool.query(
      'SELECT * FROM email_polls WHERE creator_user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getResponsesByUser(userId: string, email: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT pr.*, ep.poll_type, ep.options, e.subject
      FROM poll_responses pr
      INNER JOIN email_polls ep ON pr.poll_id = ep.id
      INNER JOIN emails e ON ep.email_id = e.id
      WHERE pr.respondent_email = $1 OR pr.respondent_user_id = $2
      ORDER BY pr.responded_at DESC
    `, [email, userId]);

    return result.rows;
  }

  async generateVotingButtonsHtml(pollId: string, baseUrl: string): Promise<string> {
    const poll = await this.getPoll(pollId);
    if (!poll) return '';

    const pollOptions = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;

    let html = `<div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<p style="margin: 0 0 10px; font-weight: bold;">Vote:</p>`;
    html += `<div style="display: flex; gap: 10px; flex-wrap: wrap;">`;

    for (const option of pollOptions) {
      const voteUrl = `${baseUrl}/api/outlook/polls/${pollId}/vote?option=${encodeURIComponent(option)}`;
      html += `<a href="${voteUrl}" style="padding: 8px 16px; background: #0078d4; color: white; text-decoration: none; border-radius: 4px;">${option}</a>`;
    }

    html += `</div></div>`;
    return html;
  }

  async getStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_polls,
        COUNT(CASE WHEN is_closed THEN 1 END) as closed_polls,
        COUNT(CASE WHEN NOT is_closed THEN 1 END) as active_polls
      FROM email_polls
      WHERE creator_user_id = $1
    `, [userId]);

    const responsesGiven = await pool.query(
      'SELECT COUNT(*) FROM poll_responses WHERE respondent_user_id = $1',
      [userId]
    );

    return {
      ...result.rows[0],
      responses_given: parseInt(responsesGiven.rows[0].count)
    };
  }
}

export const votingService = new VotingService();
