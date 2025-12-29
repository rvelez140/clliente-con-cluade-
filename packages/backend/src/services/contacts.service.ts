import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface Phone {
  type: 'mobile' | 'home' | 'work' | 'other';
  number: string;
  primary?: boolean;
}

export interface Address {
  type: 'home' | 'work' | 'other';
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface SocialProfile {
  type: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'github' | 'other';
  url: string;
  username?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  photo_url?: string;
  company?: string;
  job_title?: string;
  department?: string;
  phones: Phone[];
  addresses: Address[];
  websites: string[];
  social_profiles: SocialProfile[];
  birthday?: Date;
  anniversary?: Date;
  notes?: string;
  custom_fields: Record<string, any>;
  source: string;
  is_starred: boolean;
  interaction_count: number;
  last_contacted_at?: Date;
  last_email_received_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ContactGroup {
  id: string;
  user_id: string;
  name: string;
  color: string;
  description?: string;
  member_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateContactInput {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  photo_url?: string;
  company?: string;
  job_title?: string;
  department?: string;
  phones?: Phone[];
  addresses?: Address[];
  websites?: string[];
  social_profiles?: SocialProfile[];
  birthday?: string;
  anniversary?: string;
  notes?: string;
  custom_fields?: Record<string, any>;
}

export interface UpdateContactInput extends Partial<CreateContactInput> {
  is_starred?: boolean;
}

class ContactsService {
  async getContacts(
    userId: string,
    options: {
      search?: string;
      starred?: boolean;
      groupId?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'name' | 'email' | 'last_contacted' | 'created_at';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ contacts: Contact[]; total: number }> {
    const { search, starred, groupId, limit = 50, offset = 0, sortBy = 'name', sortOrder = 'asc' } = options;

    let query = 'SELECT c.* FROM contacts c';
    let countQuery = 'SELECT COUNT(*) FROM contacts c';
    const params: any[] = [userId];
    const conditions = ['c.user_id = $1'];
    let paramCount = 2;

    if (groupId) {
      query += ' INNER JOIN contact_group_members cgm ON c.id = cgm.contact_id';
      countQuery += ' INNER JOIN contact_group_members cgm ON c.id = cgm.contact_id';
      conditions.push(`cgm.group_id = $${paramCount++}`);
      params.push(groupId);
    }

    if (search) {
      conditions.push(`(
        c.name ILIKE $${paramCount} OR
        c.email ILIKE $${paramCount} OR
        c.first_name ILIKE $${paramCount} OR
        c.last_name ILIKE $${paramCount} OR
        c.company ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (starred !== undefined) {
      conditions.push(`c.is_starred = $${paramCount++}`);
      params.push(starred);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    const sortColumn = {
      name: 'COALESCE(c.name, c.email)',
      email: 'c.email',
      last_contacted: 'c.last_contacted_at',
      created_at: 'c.created_at'
    }[sortBy] || 'COALESCE(c.name, c.email)';

    query += whereClause + ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()} LIMIT $${paramCount++} OFFSET $${paramCount}`;
    countQuery += whereClause;

    params.push(limit, offset);

    const [contactsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);

    return {
      contacts: contactsResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  async getContact(userId: string, contactId: string): Promise<Contact | null> {
    const result = await pool.query(
      'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId]
    );
    return result.rows[0] || null;
  }

  async getContactByEmail(userId: string, email: string): Promise<Contact | null> {
    const result = await pool.query(
      'SELECT * FROM contacts WHERE user_id = $1 AND LOWER(email) = LOWER($2)',
      [userId, email]
    );
    return result.rows[0] || null;
  }

  async createContact(userId: string, input: CreateContactInput): Promise<Contact> {
    const id = uuidv4();

    // Si no hay nombre, intentar derivarlo del email
    const name = input.name || input.first_name || input.email.split('@')[0];

    const result = await pool.query(`
      INSERT INTO contacts (
        id, user_id, email, name, first_name, last_name, nickname,
        photo_url, company, job_title, department,
        phones, addresses, websites, social_profiles,
        birthday, anniversary, notes, custom_fields, source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'manual')
      RETURNING *
    `, [
      id,
      userId,
      input.email.toLowerCase(),
      name,
      input.first_name,
      input.last_name,
      input.nickname,
      input.photo_url,
      input.company,
      input.job_title,
      input.department,
      JSON.stringify(input.phones || []),
      JSON.stringify(input.addresses || []),
      JSON.stringify(input.websites || []),
      JSON.stringify(input.social_profiles || []),
      input.birthday,
      input.anniversary,
      input.notes,
      JSON.stringify(input.custom_fields || {})
    ]);

    logger.info(`Contact created: ${input.email} for user ${userId}`);
    return result.rows[0];
  }

  async updateContact(userId: string, contactId: string, input: UpdateContactInput): Promise<Contact | null> {
    const contact = await this.getContact(userId, contactId);
    if (!contact) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const fieldsToUpdate: (keyof UpdateContactInput)[] = [
      'email', 'name', 'first_name', 'last_name', 'nickname',
      'photo_url', 'company', 'job_title', 'department',
      'birthday', 'anniversary', 'notes', 'is_starred'
    ];

    for (const field of fieldsToUpdate) {
      if (input[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(field === 'email' ? input.email?.toLowerCase() : input[field]);
      }
    }

    // Campos JSON
    if (input.phones !== undefined) {
      updates.push(`phones = $${paramCount++}`);
      values.push(JSON.stringify(input.phones));
    }
    if (input.addresses !== undefined) {
      updates.push(`addresses = $${paramCount++}`);
      values.push(JSON.stringify(input.addresses));
    }
    if (input.websites !== undefined) {
      updates.push(`websites = $${paramCount++}`);
      values.push(JSON.stringify(input.websites));
    }
    if (input.social_profiles !== undefined) {
      updates.push(`social_profiles = $${paramCount++}`);
      values.push(JSON.stringify(input.social_profiles));
    }
    if (input.custom_fields !== undefined) {
      updates.push(`custom_fields = $${paramCount++}`);
      values.push(JSON.stringify(input.custom_fields));
    }

    if (updates.length === 0) return contact;

    values.push(contactId, userId);
    const result = await pool.query(`
      UPDATE contacts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async deleteContact(userId: string, contactId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId]
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info(`Contact deleted: ${contactId} for user ${userId}`);
      return true;
    }
    return false;
  }

  async starContact(userId: string, contactId: string, starred: boolean): Promise<boolean> {
    const result = await pool.query(
      'UPDATE contacts SET is_starred = $1 WHERE id = $2 AND user_id = $3',
      [starred, contactId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async recordInteraction(userId: string, email: string, type: 'sent' | 'received'): Promise<void> {
    const updateField = type === 'sent' ? 'last_contacted_at' : 'last_email_received_at';

    await pool.query(`
      UPDATE contacts
      SET ${updateField} = CURRENT_TIMESTAMP, interaction_count = interaction_count + 1
      WHERE user_id = $1 AND LOWER(email) = LOWER($2)
    `, [userId, email]);
  }

  async autoCreateContact(userId: string, email: string, name?: string): Promise<Contact | null> {
    // Verificar si ya existe
    const existing = await this.getContactByEmail(userId, email);
    if (existing) return existing;

    // Crear contacto automáticamente
    return this.createContact(userId, {
      email,
      name: name || email.split('@')[0]
    });
  }

  // Grupos de contactos
  async getGroups(userId: string): Promise<ContactGroup[]> {
    const result = await pool.query(
      'SELECT * FROM contact_groups WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    return result.rows;
  }

  async getGroup(userId: string, groupId: string): Promise<ContactGroup | null> {
    const result = await pool.query(
      'SELECT * FROM contact_groups WHERE id = $1 AND user_id = $2',
      [groupId, userId]
    );
    return result.rows[0] || null;
  }

  async createGroup(userId: string, name: string, color?: string, description?: string): Promise<ContactGroup> {
    const id = uuidv4();
    const result = await pool.query(`
      INSERT INTO contact_groups (id, user_id, name, color, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, userId, name, color || '#4285f4', description]);

    logger.info(`Contact group created: ${name} for user ${userId}`);
    return result.rows[0];
  }

  async updateGroup(userId: string, groupId: string, updates: { name?: string; color?: string; description?: string }): Promise<ContactGroup | null> {
    const group = await this.getGroup(userId, groupId);
    if (!group) return null;

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

    if (setClause.length === 0) return group;

    values.push(groupId, userId);
    const result = await pool.query(`
      UPDATE contact_groups SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async deleteGroup(userId: string, groupId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM contact_groups WHERE id = $1 AND user_id = $2',
      [groupId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async addToGroup(contactId: string, groupId: string): Promise<boolean> {
    try {
      await pool.query(`
        INSERT INTO contact_group_members (contact_id, group_id)
        VALUES ($1, $2)
        ON CONFLICT (contact_id, group_id) DO NOTHING
      `, [contactId, groupId]);
      return true;
    } catch (error) {
      logger.error('Error adding contact to group:', error);
      return false;
    }
  }

  async removeFromGroup(contactId: string, groupId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM contact_group_members WHERE contact_id = $1 AND group_id = $2',
      [contactId, groupId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getGroupMembers(userId: string, groupId: string): Promise<Contact[]> {
    const result = await pool.query(`
      SELECT c.* FROM contacts c
      INNER JOIN contact_group_members cgm ON c.id = cgm.contact_id
      WHERE cgm.group_id = $1 AND c.user_id = $2
      ORDER BY COALESCE(c.name, c.email) ASC
    `, [groupId, userId]);
    return result.rows;
  }

  async getContactGroups(userId: string, contactId: string): Promise<ContactGroup[]> {
    const result = await pool.query(`
      SELECT cg.* FROM contact_groups cg
      INNER JOIN contact_group_members cgm ON cg.id = cgm.group_id
      WHERE cgm.contact_id = $1 AND cg.user_id = $2
    `, [contactId, userId]);
    return result.rows;
  }

  // Búsqueda y sugerencias
  async searchContacts(userId: string, query: string, limit: number = 10): Promise<Contact[]> {
    const result = await pool.query(`
      SELECT * FROM contacts
      WHERE user_id = $1 AND (
        name ILIKE $2 OR
        email ILIKE $2 OR
        first_name ILIKE $2 OR
        last_name ILIKE $2
      )
      ORDER BY interaction_count DESC, name ASC
      LIMIT $3
    `, [userId, `%${query}%`, limit]);
    return result.rows;
  }

  async getFrequentContacts(userId: string, limit: number = 10): Promise<Contact[]> {
    const result = await pool.query(`
      SELECT * FROM contacts
      WHERE user_id = $1 AND interaction_count > 0
      ORDER BY interaction_count DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  async getRecentContacts(userId: string, limit: number = 10): Promise<Contact[]> {
    const result = await pool.query(`
      SELECT * FROM contacts
      WHERE user_id = $1 AND last_contacted_at IS NOT NULL
      ORDER BY last_contacted_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  // Importación/Exportación
  async importContacts(userId: string, contacts: CreateContactInput[], source: string = 'import'): Promise<{ imported: number; skipped: number; errors: number }> {
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        const existing = await this.getContactByEmail(userId, contact.email);
        if (existing) {
          skipped++;
          continue;
        }

        await pool.query(`
          INSERT INTO contacts (
            id, user_id, email, name, first_name, last_name, nickname,
            photo_url, company, job_title, department,
            phones, addresses, websites, social_profiles,
            birthday, anniversary, notes, custom_fields, source
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `, [
          uuidv4(),
          userId,
          contact.email.toLowerCase(),
          contact.name || contact.email.split('@')[0],
          contact.first_name,
          contact.last_name,
          contact.nickname,
          contact.photo_url,
          contact.company,
          contact.job_title,
          contact.department,
          JSON.stringify(contact.phones || []),
          JSON.stringify(contact.addresses || []),
          JSON.stringify(contact.websites || []),
          JSON.stringify(contact.social_profiles || []),
          contact.birthday,
          contact.anniversary,
          contact.notes,
          JSON.stringify(contact.custom_fields || {}),
          source
        ]);
        imported++;
      } catch (error) {
        logger.error('Error importing contact:', error);
        errors++;
      }
    }

    logger.info(`Contacts imported for user ${userId}: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    return { imported, skipped, errors };
  }

  async exportContacts(userId: string, format: 'json' | 'csv' | 'vcard'): Promise<string> {
    const contacts = await pool.query(
      'SELECT * FROM contacts WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );

    switch (format) {
      case 'json':
        return JSON.stringify(contacts.rows, null, 2);

      case 'csv':
        const headers = ['Name', 'Email', 'Phone', 'Company', 'Job Title', 'Notes'];
        const rows = contacts.rows.map(c => [
          c.name || '',
          c.email,
          (c.phones?.[0] as Phone)?.number || '',
          c.company || '',
          c.job_title || '',
          c.notes || ''
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        return [headers.join(','), ...rows].join('\n');

      case 'vcard':
        return contacts.rows.map(c => this.contactToVCard(c)).join('\n');

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private contactToVCard(contact: Contact): string {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name || contact.email}`,
      `EMAIL:${contact.email}`
    ];

    if (contact.first_name || contact.last_name) {
      lines.push(`N:${contact.last_name || ''};${contact.first_name || ''};;;`);
    }
    if (contact.company) {
      lines.push(`ORG:${contact.company}`);
    }
    if (contact.job_title) {
      lines.push(`TITLE:${contact.job_title}`);
    }
    if (contact.phones) {
      for (const phone of contact.phones) {
        lines.push(`TEL;TYPE=${phone.type.toUpperCase()}:${phone.number}`);
      }
    }
    if (contact.birthday) {
      lines.push(`BDAY:${new Date(contact.birthday).toISOString().split('T')[0].replace(/-/g, '')}`);
    }
    if (contact.notes) {
      lines.push(`NOTE:${contact.notes.replace(/\n/g, '\\n')}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  async mergeContacts(userId: string, primaryContactId: string, secondaryContactIds: string[]): Promise<Contact | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const primary = await this.getContact(userId, primaryContactId);
      if (!primary) {
        throw new Error('Primary contact not found');
      }

      // Obtener contactos secundarios
      const secondaries: Contact[] = [];
      for (const id of secondaryContactIds) {
        const contact = await this.getContact(userId, id);
        if (contact) {
          secondaries.push(contact);
        }
      }

      // Combinar datos
      const mergedPhones = [...(primary.phones || [])];
      const mergedAddresses = [...(primary.addresses || [])];
      const mergedWebsites = [...(primary.websites || [])];
      const mergedSocialProfiles = [...(primary.social_profiles || [])];
      let mergedNotes = primary.notes || '';

      for (const secondary of secondaries) {
        // Merge phones
        for (const phone of (secondary.phones || [])) {
          if (!mergedPhones.some(p => p.number === phone.number)) {
            mergedPhones.push(phone);
          }
        }
        // Merge addresses
        for (const addr of (secondary.addresses || [])) {
          if (!mergedAddresses.some(a => a.street === addr.street && a.city === addr.city)) {
            mergedAddresses.push(addr);
          }
        }
        // Merge notes
        if (secondary.notes && !mergedNotes.includes(secondary.notes)) {
          mergedNotes += (mergedNotes ? '\n---\n' : '') + secondary.notes;
        }
      }

      // Actualizar contacto primario
      await client.query(`
        UPDATE contacts SET
          phones = $1,
          addresses = $2,
          websites = $3,
          social_profiles = $4,
          notes = $5,
          interaction_count = interaction_count + $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `, [
        JSON.stringify(mergedPhones),
        JSON.stringify(mergedAddresses),
        JSON.stringify(mergedWebsites),
        JSON.stringify(mergedSocialProfiles),
        mergedNotes,
        secondaries.reduce((sum, c) => sum + c.interaction_count, 0),
        primaryContactId
      ]);

      // Eliminar contactos secundarios
      for (const id of secondaryContactIds) {
        await client.query('DELETE FROM contacts WHERE id = $1', [id]);
      }

      await client.query('COMMIT');

      logger.info(`Merged ${secondaryContactIds.length} contacts into ${primaryContactId}`);
      return this.getContact(userId, primaryContactId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const contactsService = new ContactsService();
