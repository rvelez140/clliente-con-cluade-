import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface Resource {
  id: string;
  organization_id?: string;
  name: string;
  email: string;
  resource_type: 'room' | 'equipment' | 'vehicle' | 'other';
  description?: string;
  location?: string;
  capacity?: number;
  amenities?: string[];
  photo_url?: string;
  is_active: boolean;
  booking_rules?: {
    minDuration?: number;
    maxDuration?: number;
    advanceBookingDays?: number;
    requiresApproval?: boolean;
    allowRecurring?: boolean;
    workingHours?: { start: string; end: string };
    blockedDays?: number[];
  };
  created_at: Date;
  updated_at: Date;
}

export interface ResourceBooking {
  id: string;
  resource_id: string;
  user_id: string;
  event_id?: string;
  title: string;
  start_time: Date;
  end_time: Date;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  attendees_count?: number;
  notes?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  created_at: Date;
  updated_at: Date;
}

class ResourcesService {
  // Gestión de recursos
  async createResource(
    input: {
      organizationId?: string;
      name: string;
      email: string;
      resourceType: Resource['resource_type'];
      description?: string;
      location?: string;
      capacity?: number;
      amenities?: string[];
      photoUrl?: string;
      bookingRules?: Resource['booking_rules'];
    }
  ): Promise<Resource> {
    const id = uuidv4();

    const result = await pool.query(`
      INSERT INTO resources (
        id, organization_id, name, email, resource_type, description,
        location, capacity, amenities, photo_url, booking_rules
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      id,
      input.organizationId,
      input.name,
      input.email,
      input.resourceType,
      input.description,
      input.location,
      input.capacity,
      input.amenities ? JSON.stringify(input.amenities) : null,
      input.photoUrl,
      input.bookingRules ? JSON.stringify(input.bookingRules) : null
    ]);

    logger.info(`Resource created: ${input.name} (${input.resourceType})`);
    return result.rows[0];
  }

  async getResources(options: {
    organizationId?: string;
    resourceType?: Resource['resource_type'];
    location?: string;
    minCapacity?: number;
    activeOnly?: boolean;
    search?: string;
  } = {}): Promise<Resource[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (options.organizationId) {
      conditions.push(`organization_id = $${paramCount++}`);
      params.push(options.organizationId);
    }

    if (options.resourceType) {
      conditions.push(`resource_type = $${paramCount++}`);
      params.push(options.resourceType);
    }

    if (options.location) {
      conditions.push(`location ILIKE $${paramCount++}`);
      params.push(`%${options.location}%`);
    }

    if (options.minCapacity) {
      conditions.push(`capacity >= $${paramCount++}`);
      params.push(options.minCapacity);
    }

    if (options.activeOnly !== false) {
      conditions.push('is_active = TRUE');
    }

    if (options.search) {
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${options.search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT * FROM resources
      ${whereClause}
      ORDER BY resource_type, name ASC
    `, params);

    return result.rows;
  }

  async getResource(resourceId: string): Promise<Resource | null> {
    const result = await pool.query(
      'SELECT * FROM resources WHERE id = $1',
      [resourceId]
    );
    return result.rows[0] || null;
  }

  async updateResource(
    resourceId: string,
    updates: Partial<{
      name: string;
      email: string;
      resourceType: Resource['resource_type'];
      description: string;
      location: string;
      capacity: number;
      amenities: string[];
      photoUrl: string;
      isActive: boolean;
      bookingRules: Resource['booking_rules'];
    }>
  ): Promise<Resource | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      setClause.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }
    if (updates.resourceType !== undefined) {
      setClause.push(`resource_type = $${paramCount++}`);
      values.push(updates.resourceType);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.location !== undefined) {
      setClause.push(`location = $${paramCount++}`);
      values.push(updates.location);
    }
    if (updates.capacity !== undefined) {
      setClause.push(`capacity = $${paramCount++}`);
      values.push(updates.capacity);
    }
    if (updates.amenities !== undefined) {
      setClause.push(`amenities = $${paramCount++}`);
      values.push(JSON.stringify(updates.amenities));
    }
    if (updates.photoUrl !== undefined) {
      setClause.push(`photo_url = $${paramCount++}`);
      values.push(updates.photoUrl);
    }
    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }
    if (updates.bookingRules !== undefined) {
      setClause.push(`booking_rules = $${paramCount++}`);
      values.push(JSON.stringify(updates.bookingRules));
    }

    if (setClause.length === 0) return this.getResource(resourceId);

    values.push(resourceId);
    const result = await pool.query(`
      UPDATE resources
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    // Cancelar reservas futuras
    await pool.query(`
      UPDATE resource_bookings
      SET status = 'cancelled'
      WHERE resource_id = $1 AND start_time > CURRENT_TIMESTAMP
    `, [resourceId]);

    const result = await pool.query(
      'DELETE FROM resources WHERE id = $1',
      [resourceId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // Reservas
  async createBooking(
    userId: string,
    input: {
      resourceId: string;
      eventId?: string;
      title: string;
      startTime: Date;
      endTime: Date;
      attendeesCount?: number;
      notes?: string;
      isRecurring?: boolean;
      recurrenceRule?: string;
    }
  ): Promise<ResourceBooking> {
    const resource = await this.getResource(input.resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }

    if (!resource.is_active) {
      throw new Error('Resource is not available');
    }

    // Verificar reglas de reserva
    if (resource.booking_rules) {
      const rules = typeof resource.booking_rules === 'string'
        ? JSON.parse(resource.booking_rules)
        : resource.booking_rules;

      const durationMinutes = (new Date(input.endTime).getTime() - new Date(input.startTime).getTime()) / 60000;

      if (rules.minDuration && durationMinutes < rules.minDuration) {
        throw new Error(`Minimum booking duration is ${rules.minDuration} minutes`);
      }

      if (rules.maxDuration && durationMinutes > rules.maxDuration) {
        throw new Error(`Maximum booking duration is ${rules.maxDuration} minutes`);
      }

      if (rules.advanceBookingDays) {
        const daysAhead = (new Date(input.startTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysAhead > rules.advanceBookingDays) {
          throw new Error(`Cannot book more than ${rules.advanceBookingDays} days in advance`);
        }
      }

      if (rules.blockedDays) {
        const dayOfWeek = new Date(input.startTime).getDay();
        if (rules.blockedDays.includes(dayOfWeek)) {
          throw new Error('Resource is not available on this day');
        }
      }
    }

    // Verificar capacidad
    if (resource.capacity && input.attendeesCount && input.attendeesCount > resource.capacity) {
      throw new Error(`Resource capacity is ${resource.capacity}`);
    }

    // Verificar conflictos
    const conflicts = await this.checkConflicts(
      input.resourceId,
      new Date(input.startTime),
      new Date(input.endTime)
    );

    if (conflicts.length > 0) {
      throw new Error('Resource is already booked for this time');
    }

    const id = uuidv4();
    const requiresApproval = resource.booking_rules?.requiresApproval;

    const result = await pool.query(`
      INSERT INTO resource_bookings (
        id, resource_id, user_id, event_id, title, start_time, end_time,
        status, attendees_count, notes, is_recurring, recurrence_rule
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      id,
      input.resourceId,
      userId,
      input.eventId,
      input.title,
      input.startTime,
      input.endTime,
      requiresApproval ? 'pending' : 'confirmed',
      input.attendeesCount,
      input.notes,
      input.isRecurring || false,
      input.recurrenceRule
    ]);

    logger.info(`Resource booking created: ${resource.name} by user ${userId}`);
    return result.rows[0];
  }

  async getBooking(bookingId: string): Promise<ResourceBooking | null> {
    const result = await pool.query(
      'SELECT * FROM resource_bookings WHERE id = $1',
      [bookingId]
    );
    return result.rows[0] || null;
  }

  async getResourceBookings(
    resourceId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      status?: ResourceBooking['status'];
    } = {}
  ): Promise<ResourceBooking[]> {
    const conditions: string[] = ['resource_id = $1'];
    const params: any[] = [resourceId];
    let paramCount = 2;

    if (options.startDate) {
      conditions.push(`start_time >= $${paramCount++}`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`end_time <= $${paramCount++}`);
      params.push(options.endDate);
    }

    if (options.status) {
      conditions.push(`status = $${paramCount++}`);
      params.push(options.status);
    }

    const result = await pool.query(`
      SELECT rb.*, u.email as user_email, u.name as user_name
      FROM resource_bookings rb
      LEFT JOIN users u ON rb.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY start_time ASC
    `, params);

    return result.rows;
  }

  async getUserBookings(
    userId: string,
    options: {
      upcoming?: boolean;
      status?: ResourceBooking['status'];
    } = {}
  ): Promise<any[]> {
    const conditions: string[] = ['rb.user_id = $1'];
    const params: any[] = [userId];
    let paramCount = 2;

    if (options.upcoming) {
      conditions.push('rb.start_time > CURRENT_TIMESTAMP');
    }

    if (options.status) {
      conditions.push(`rb.status = $${paramCount++}`);
      params.push(options.status);
    }

    const result = await pool.query(`
      SELECT rb.*, r.name as resource_name, r.resource_type, r.location
      FROM resource_bookings rb
      INNER JOIN resources r ON rb.resource_id = r.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY rb.start_time ASC
    `, params);

    return result.rows;
  }

  async updateBooking(
    userId: string,
    bookingId: string,
    updates: Partial<{
      title: string;
      startTime: Date;
      endTime: Date;
      attendeesCount: number;
      notes: string;
    }>
  ): Promise<ResourceBooking | null> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return null;

    if (booking.user_id !== userId) {
      throw new Error('Not authorized to update this booking');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Cannot update a cancelled booking');
    }

    // Si cambian las fechas, verificar conflictos
    if (updates.startTime || updates.endTime) {
      const startTime = updates.startTime || booking.start_time;
      const endTime = updates.endTime || booking.end_time;

      const conflicts = await this.checkConflicts(
        booking.resource_id,
        new Date(startTime),
        new Date(endTime),
        bookingId
      );

      if (conflicts.length > 0) {
        throw new Error('Resource is already booked for this time');
      }
    }

    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      setClause.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }
    if (updates.startTime !== undefined) {
      setClause.push(`start_time = $${paramCount++}`);
      values.push(updates.startTime);
    }
    if (updates.endTime !== undefined) {
      setClause.push(`end_time = $${paramCount++}`);
      values.push(updates.endTime);
    }
    if (updates.attendeesCount !== undefined) {
      setClause.push(`attendees_count = $${paramCount++}`);
      values.push(updates.attendeesCount);
    }
    if (updates.notes !== undefined) {
      setClause.push(`notes = $${paramCount++}`);
      values.push(updates.notes);
    }

    if (setClause.length === 0) return booking;

    values.push(bookingId);
    const result = await pool.query(`
      UPDATE resource_bookings
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async cancelBooking(userId: string, bookingId: string): Promise<ResourceBooking | null> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return null;

    if (booking.user_id !== userId) {
      throw new Error('Not authorized to cancel this booking');
    }

    const result = await pool.query(`
      UPDATE resource_bookings
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [bookingId]);

    logger.info(`Booking ${bookingId} cancelled by user ${userId}`);
    return result.rows[0] || null;
  }

  async approveBooking(bookingId: string): Promise<ResourceBooking | null> {
    const result = await pool.query(`
      UPDATE resource_bookings
      SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `, [bookingId]);

    return result.rows[0] || null;
  }

  async declineBooking(bookingId: string): Promise<ResourceBooking | null> {
    const result = await pool.query(`
      UPDATE resource_bookings
      SET status = 'declined', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `, [bookingId]);

    return result.rows[0] || null;
  }

  // Disponibilidad
  async checkConflicts(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<ResourceBooking[]> {
    let query = `
      SELECT * FROM resource_bookings
      WHERE resource_id = $1
        AND status NOT IN ('cancelled', 'declined')
        AND (
          (start_time < $3 AND end_time > $2)
        )
    `;
    const params: any[] = [resourceId, startTime, endTime];

    if (excludeBookingId) {
      query += ' AND id != $4';
      params.push(excludeBookingId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getAvailability(
    resourceId: string,
    date: Date
  ): Promise<{ available: boolean; slots: { start: string; end: string }[] }> {
    const resource = await this.getResource(resourceId);
    if (!resource || !resource.is_active) {
      return { available: false, slots: [] };
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.getResourceBookings(resourceId, {
      startDate: startOfDay,
      endDate: endOfDay,
      status: 'confirmed'
    });

    // Calcular slots disponibles
    const rules = resource.booking_rules;
    const workingHours = rules?.workingHours || { start: '08:00', end: '18:00' };

    const slots: { start: string; end: string }[] = [];
    let currentSlotStart = workingHours.start;

    for (const booking of bookings) {
      const bookingStart = new Date(booking.start_time).toTimeString().substring(0, 5);
      const bookingEnd = new Date(booking.end_time).toTimeString().substring(0, 5);

      if (currentSlotStart < bookingStart) {
        slots.push({ start: currentSlotStart, end: bookingStart });
      }
      currentSlotStart = bookingEnd;
    }

    if (currentSlotStart < workingHours.end) {
      slots.push({ start: currentSlotStart, end: workingHours.end });
    }

    return {
      available: slots.length > 0,
      slots
    };
  }

  async findAvailableResources(
    startTime: Date,
    endTime: Date,
    options: {
      resourceType?: Resource['resource_type'];
      minCapacity?: number;
      location?: string;
      amenities?: string[];
    } = {}
  ): Promise<Resource[]> {
    const resources = await this.getResources({
      resourceType: options.resourceType,
      minCapacity: options.minCapacity,
      location: options.location,
      activeOnly: true
    });

    const availableResources: Resource[] = [];

    for (const resource of resources) {
      const conflicts = await this.checkConflicts(resource.id, startTime, endTime);

      if (conflicts.length === 0) {
        // Verificar amenities si se especificaron
        if (options.amenities && options.amenities.length > 0) {
          const resourceAmenities = typeof resource.amenities === 'string'
            ? JSON.parse(resource.amenities)
            : resource.amenities || [];

          const hasAllAmenities = options.amenities.every(a =>
            resourceAmenities.includes(a)
          );

          if (!hasAllAmenities) continue;
        }

        availableResources.push(resource);
      }
    }

    return availableResources;
  }

  // Estadísticas
  async getResourceStats(resourceId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined,
        AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) as avg_duration_minutes
      FROM resource_bookings
      WHERE resource_id = $1
    `, [resourceId]);

    return result.rows[0];
  }

  async getUsageReport(
    resourceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const result = await pool.query(`
      SELECT
        DATE(start_time) as date,
        COUNT(*) as bookings,
        SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) as hours_used
      FROM resource_bookings
      WHERE resource_id = $1
        AND start_time >= $2
        AND end_time <= $3
        AND status = 'confirmed'
      GROUP BY DATE(start_time)
      ORDER BY date ASC
    `, [resourceId, startDate, endDate]);

    return result.rows;
  }
}

export const resourcesService = new ResourcesService();
