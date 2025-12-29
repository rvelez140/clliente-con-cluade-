import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { DateTime } from 'luxon';

export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  color: string;
  description?: string;
  timezone: string;
  is_primary: boolean;
  is_visible: boolean;
  external_id?: string;
  external_provider?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CalendarEvent {
  id: string;
  calendar_id: string;
  user_id: string;
  email_id?: string;
  title: string;
  description?: string;
  location?: string;
  video_conference_url?: string;
  video_conference_provider?: string;
  start_time: Date;
  end_time: Date;
  all_day: boolean;
  timezone: string;
  recurrence_rule?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'default' | 'public' | 'private' | 'confidential';
  reminders: any[];
  organizer_email?: string;
  organizer_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  email: string;
  name?: string;
  response_status: 'needs_action' | 'accepted' | 'declined' | 'tentative';
  is_organizer: boolean;
  is_optional: boolean;
  comment?: string;
}

export interface CreateEventInput {
  calendarId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  timezone?: string;
  recurrenceRule?: string;
  visibility?: CalendarEvent['visibility'];
  reminders?: { method: 'email' | 'popup' | 'sms'; minutes: number }[];
  attendees?: { email: string; name?: string; optional?: boolean }[];
  videoConference?: {
    provider: 'google_meet' | 'zoom' | 'teams' | 'custom';
    url?: string;
  };
  emailId?: string;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: CalendarEvent['status'];
}

class CalendarService {
  // ==================== CALENDARS ====================

  async getCalendars(userId: string): Promise<Calendar[]> {
    const result = await pool.query(
      'SELECT * FROM calendars WHERE user_id = $1 ORDER BY is_primary DESC, name ASC',
      [userId]
    );
    return result.rows;
  }

  async getCalendar(userId: string, calendarId: string): Promise<Calendar | null> {
    const result = await pool.query(
      'SELECT * FROM calendars WHERE id = $1 AND user_id = $2',
      [calendarId, userId]
    );
    return result.rows[0] || null;
  }

  async createCalendar(
    userId: string,
    name: string,
    options: {
      color?: string;
      description?: string;
      timezone?: string;
      isPrimary?: boolean;
    } = {}
  ): Promise<Calendar> {
    const id = uuidv4();

    if (options.isPrimary) {
      await pool.query(
        'UPDATE calendars SET is_primary = FALSE WHERE user_id = $1',
        [userId]
      );
    }

    const result = await pool.query(`
      INSERT INTO calendars (id, user_id, name, color, description, timezone, is_primary)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      id,
      userId,
      name,
      options.color || '#4285f4',
      options.description,
      options.timezone || 'UTC',
      options.isPrimary || false
    ]);

    logger.info(`Calendar created: ${name} for user ${userId}`);
    return result.rows[0];
  }

  async updateCalendar(
    userId: string,
    calendarId: string,
    updates: {
      name?: string;
      color?: string;
      description?: string;
      timezone?: string;
      isPrimary?: boolean;
      isVisible?: boolean;
    }
  ): Promise<Calendar | null> {
    if (updates.isPrimary) {
      await pool.query(
        'UPDATE calendars SET is_primary = FALSE WHERE user_id = $1',
        [userId]
      );
    }

    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      setClause.push(`color = $${paramCount++}`);
      values.push(updates.color);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.timezone !== undefined) {
      setClause.push(`timezone = $${paramCount++}`);
      values.push(updates.timezone);
    }
    if (updates.isPrimary !== undefined) {
      setClause.push(`is_primary = $${paramCount++}`);
      values.push(updates.isPrimary);
    }
    if (updates.isVisible !== undefined) {
      setClause.push(`is_visible = $${paramCount++}`);
      values.push(updates.isVisible);
    }

    if (setClause.length === 0) return this.getCalendar(userId, calendarId);

    values.push(calendarId, userId);
    const result = await pool.query(`
      UPDATE calendars SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async deleteCalendar(userId: string, calendarId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM calendars WHERE id = $1 AND user_id = $2 AND is_primary = FALSE',
      [calendarId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ==================== EVENTS ====================

  async getEvents(
    userId: string,
    options: {
      calendarId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ events: any[]; total: number }> {
    const { calendarId, startDate, endDate, limit = 100, offset = 0 } = options;

    const conditions: string[] = ['ce.user_id = $1'];
    const params: any[] = [userId];
    let paramCount = 2;

    // Solo mostrar eventos de calendarios visibles
    conditions.push(`c.is_visible = TRUE`);

    if (calendarId) {
      conditions.push(`ce.calendar_id = $${paramCount++}`);
      params.push(calendarId);
    }

    if (startDate) {
      conditions.push(`ce.end_time >= $${paramCount++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`ce.start_time <= $${paramCount++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(`
      SELECT COUNT(*)
      FROM calendar_events ce
      INNER JOIN calendars c ON ce.calendar_id = c.id
      WHERE ${whereClause}
    `, params);

    params.push(limit, offset);
    const result = await pool.query(`
      SELECT ce.*, c.name as calendar_name, c.color as calendar_color
      FROM calendar_events ce
      INNER JOIN calendars c ON ce.calendar_id = c.id
      WHERE ${whereClause}
      ORDER BY ce.start_time ASC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `, params);

    // Obtener asistentes para cada evento
    const events = await Promise.all(result.rows.map(async (event: any) => {
      const attendees = await pool.query(
        'SELECT * FROM event_attendees WHERE event_id = $1',
        [event.id]
      );
      return { ...event, attendees: attendees.rows };
    }));

    return {
      events,
      total: parseInt(countResult.rows[0].count)
    };
  }

  async getEvent(userId: string, eventId: string): Promise<any | null> {
    const result = await pool.query(`
      SELECT ce.*, c.name as calendar_name, c.color as calendar_color
      FROM calendar_events ce
      INNER JOIN calendars c ON ce.calendar_id = c.id
      WHERE ce.id = $1 AND ce.user_id = $2
    `, [eventId, userId]);

    if (!result.rows[0]) return null;

    const attendees = await pool.query(
      'SELECT * FROM event_attendees WHERE event_id = $1',
      [eventId]
    );

    return { ...result.rows[0], attendees: attendees.rows };
  }

  async getEventsForDate(userId: string, date: string): Promise<any[]> {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const result = await this.getEvents(userId, {
      startDate: startOfDay,
      endDate: endOfDay
    });

    return result.events;
  }

  async getUpcomingEvents(userId: string, days: number = 7): Promise<any[]> {
    const now = new Date().toISOString();
    const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const result = await this.getEvents(userId, {
      startDate: now,
      endDate: future,
      limit: 50
    });

    return result.events;
  }

  async createEvent(userId: string, input: CreateEventInput): Promise<any> {
    const id = uuidv4();

    // Obtener calendario
    let calendarId = input.calendarId;
    if (!calendarId) {
      const primaryCalendar = await pool.query(
        'SELECT id FROM calendars WHERE user_id = $1 AND is_primary = TRUE',
        [userId]
      );
      if (primaryCalendar.rows[0]) {
        calendarId = primaryCalendar.rows[0].id;
      } else {
        const newCalendar = await this.createCalendar(userId, 'Mi calendario', { isPrimary: true });
        calendarId = newCalendar.id;
      }
    }

    const result = await pool.query(`
      INSERT INTO calendar_events (
        id, calendar_id, user_id, email_id, title, description, location,
        video_conference_url, video_conference_provider,
        start_time, end_time, all_day, timezone, recurrence_rule,
        visibility, reminders
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      id,
      calendarId,
      userId,
      input.emailId,
      input.title,
      input.description,
      input.location,
      input.videoConference?.url,
      input.videoConference?.provider,
      input.startTime,
      input.endTime,
      input.allDay || false,
      input.timezone || 'UTC',
      input.recurrenceRule,
      input.visibility || 'default',
      JSON.stringify(input.reminders || [])
    ]);

    // Agregar asistentes
    if (input.attendees && input.attendees.length > 0) {
      for (const attendee of input.attendees) {
        await this.addAttendee(id, attendee.email, attendee.name, attendee.optional);
      }
    }

    logger.info(`Calendar event created: ${input.title} for user ${userId}`);
    return this.getEvent(userId, id);
  }

  async updateEvent(userId: string, eventId: string, input: UpdateEventInput): Promise<any | null> {
    const event = await this.getEvent(userId, eventId);
    if (!event) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(input.description);
    }
    if (input.location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(input.location);
    }
    if (input.startTime !== undefined) {
      updates.push(`start_time = $${paramCount++}`);
      values.push(input.startTime);
    }
    if (input.endTime !== undefined) {
      updates.push(`end_time = $${paramCount++}`);
      values.push(input.endTime);
    }
    if (input.allDay !== undefined) {
      updates.push(`all_day = $${paramCount++}`);
      values.push(input.allDay);
    }
    if (input.timezone !== undefined) {
      updates.push(`timezone = $${paramCount++}`);
      values.push(input.timezone);
    }
    if (input.recurrenceRule !== undefined) {
      updates.push(`recurrence_rule = $${paramCount++}`);
      values.push(input.recurrenceRule);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(input.status);
    }
    if (input.visibility !== undefined) {
      updates.push(`visibility = $${paramCount++}`);
      values.push(input.visibility);
    }
    if (input.reminders !== undefined) {
      updates.push(`reminders = $${paramCount++}`);
      values.push(JSON.stringify(input.reminders));
    }
    if (input.videoConference !== undefined) {
      updates.push(`video_conference_url = $${paramCount++}`);
      values.push(input.videoConference.url);
      updates.push(`video_conference_provider = $${paramCount++}`);
      values.push(input.videoConference.provider);
    }

    if (updates.length > 0) {
      values.push(eventId, userId);
      await pool.query(`
        UPDATE calendar_events SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount++} AND user_id = $${paramCount}
      `, values);
    }

    // Actualizar asistentes si se proporcionan
    if (input.attendees !== undefined) {
      await pool.query('DELETE FROM event_attendees WHERE event_id = $1', [eventId]);
      for (const attendee of input.attendees) {
        await this.addAttendee(eventId, attendee.email, attendee.name, attendee.optional);
      }
    }

    return this.getEvent(userId, eventId);
  }

  async deleteEvent(userId: string, eventId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2',
      [eventId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ==================== ATTENDEES ====================

  async addAttendee(
    eventId: string,
    email: string,
    name?: string,
    optional?: boolean
  ): Promise<EventAttendee> {
    const id = uuidv4();

    const result = await pool.query(`
      INSERT INTO event_attendees (id, event_id, email, name, is_optional)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (event_id, email) DO UPDATE SET name = EXCLUDED.name, is_optional = EXCLUDED.is_optional
      RETURNING *
    `, [id, eventId, email, name, optional || false]);

    return result.rows[0];
  }

  async updateAttendeeResponse(
    eventId: string,
    email: string,
    response: EventAttendee['response_status'],
    comment?: string
  ): Promise<boolean> {
    const result = await pool.query(`
      UPDATE event_attendees
      SET response_status = $3, comment = $4, responded_at = CURRENT_TIMESTAMP
      WHERE event_id = $1 AND email = $2
    `, [eventId, email, response, comment]);

    return (result.rowCount ?? 0) > 0;
  }

  async removeAttendee(eventId: string, email: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM event_attendees WHERE event_id = $1 AND email = $2',
      [eventId, email]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ==================== EMAIL INTEGRATION ====================

  async createEventFromEmail(userId: string, emailId: string): Promise<any> {
    const email = await pool.query('SELECT * FROM emails WHERE id = $1', [emailId]);
    if (!email.rows[0]) {
      throw new Error('Email not found');
    }

    const emailData = email.rows[0];

    // Crear evento básico desde el email
    const now = DateTime.now();
    const startTime = now.plus({ hours: 1 }).startOf('hour');
    const endTime = startTime.plus({ hours: 1 });

    return this.createEvent(userId, {
      title: `Reunión: ${emailData.subject}`,
      description: `Relacionado con email de ${emailData.from_address}`,
      startTime: startTime.toISO()!,
      endTime: endTime.toISO()!,
      emailId,
      attendees: [{ email: emailData.from_address }]
    });
  }

  async getEventsForEmail(userId: string, emailId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT ce.*, c.name as calendar_name, c.color as calendar_color
      FROM calendar_events ce
      INNER JOIN calendars c ON ce.calendar_id = c.id
      WHERE ce.email_id = $1 AND ce.user_id = $2
      ORDER BY ce.start_time ASC
    `, [emailId, userId]);
    return result.rows;
  }

  // ==================== iCAL ====================

  async exportToICal(userId: string, calendarId?: string): Promise<string> {
    const events = calendarId
      ? (await this.getEvents(userId, { calendarId })).events
      : (await this.getEvents(userId, {})).events;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gemini Mail//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    for (const event of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@geminimail.com`);
      lines.push(`DTSTAMP:${this.formatICalDate(new Date())}`);
      lines.push(`DTSTART:${this.formatICalDate(new Date(event.start_time))}`);
      lines.push(`DTEND:${this.formatICalDate(new Date(event.end_time))}`);
      lines.push(`SUMMARY:${event.title}`);
      if (event.description) {
        lines.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
      }
      if (event.location) {
        lines.push(`LOCATION:${event.location}`);
      }
      lines.push(`STATUS:${event.status.toUpperCase()}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  async getStatistics(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN start_time > NOW() THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN start_time < NOW() THEN 1 END) as past_events,
        COUNT(CASE WHEN all_day THEN 1 END) as all_day_events,
        COUNT(DISTINCT calendar_id) as calendars_used
      FROM calendar_events
      WHERE user_id = $1
    `, [userId]);

    return result.rows[0];
  }
}

export const calendarService = new CalendarService();
