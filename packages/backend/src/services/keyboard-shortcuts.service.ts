import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface KeyboardShortcut {
  id: string;
  user_id: string | null;
  action_id: string;
  key_combination: string;
  is_enabled: boolean;
  is_custom: boolean;
  description?: string;
  category?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: KeyboardShortcut[];
}

class KeyboardShortcutsService {
  // Atajos predeterminados del sistema
  private readonly defaultShortcuts: Omit<KeyboardShortcut, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
    // Composición
    { action_id: 'compose_email', key_combination: 'c', is_enabled: true, is_custom: false, description: 'Redactar nuevo correo', category: 'compose' },
    { action_id: 'reply', key_combination: 'r', is_enabled: true, is_custom: false, description: 'Responder', category: 'compose' },
    { action_id: 'reply_all', key_combination: 'a', is_enabled: true, is_custom: false, description: 'Responder a todos', category: 'compose' },
    { action_id: 'forward', key_combination: 'f', is_enabled: true, is_custom: false, description: 'Reenviar', category: 'compose' },
    { action_id: 'send_email', key_combination: 'ctrl+enter', is_enabled: true, is_custom: false, description: 'Enviar correo', category: 'compose' },
    { action_id: 'discard_draft', key_combination: 'ctrl+shift+d', is_enabled: true, is_custom: false, description: 'Descartar borrador', category: 'compose' },
    { action_id: 'save_draft', key_combination: 'ctrl+s', is_enabled: true, is_custom: false, description: 'Guardar borrador', category: 'compose' },
    { action_id: 'add_cc', key_combination: 'ctrl+shift+c', is_enabled: true, is_custom: false, description: 'Añadir CC', category: 'compose' },
    { action_id: 'add_bcc', key_combination: 'ctrl+shift+b', is_enabled: true, is_custom: false, description: 'Añadir BCC', category: 'compose' },

    // Acciones
    { action_id: 'archive', key_combination: 'e', is_enabled: true, is_custom: false, description: 'Archivar', category: 'actions' },
    { action_id: 'delete', key_combination: '#', is_enabled: true, is_custom: false, description: 'Eliminar', category: 'actions' },
    { action_id: 'mark_read', key_combination: 'shift+i', is_enabled: true, is_custom: false, description: 'Marcar como leído', category: 'actions' },
    { action_id: 'mark_unread', key_combination: 'shift+u', is_enabled: true, is_custom: false, description: 'Marcar como no leído', category: 'actions' },
    { action_id: 'star', key_combination: 's', is_enabled: true, is_custom: false, description: 'Destacar/Quitar destacado', category: 'actions' },
    { action_id: 'snooze', key_combination: 'b', is_enabled: true, is_custom: false, description: 'Posponer', category: 'actions' },
    { action_id: 'mute', key_combination: 'm', is_enabled: true, is_custom: false, description: 'Silenciar conversación', category: 'actions' },
    { action_id: 'move_to', key_combination: 'v', is_enabled: true, is_custom: false, description: 'Mover a...', category: 'actions' },
    { action_id: 'label', key_combination: 'l', is_enabled: true, is_custom: false, description: 'Aplicar etiqueta', category: 'actions' },
    { action_id: 'spam', key_combination: '!', is_enabled: true, is_custom: false, description: 'Marcar como spam', category: 'actions' },
    { action_id: 'not_spam', key_combination: 'shift+!', is_enabled: true, is_custom: false, description: 'No es spam', category: 'actions' },
    { action_id: 'undo', key_combination: 'z', is_enabled: true, is_custom: false, description: 'Deshacer última acción', category: 'actions' },
    { action_id: 'mark_important', key_combination: '+', is_enabled: true, is_custom: false, description: 'Marcar como importante', category: 'actions' },
    { action_id: 'mark_not_important', key_combination: '-', is_enabled: true, is_custom: false, description: 'Quitar importante', category: 'actions' },

    // Navegación
    { action_id: 'search', key_combination: '/', is_enabled: true, is_custom: false, description: 'Buscar', category: 'navigation' },
    { action_id: 'go_inbox', key_combination: 'g i', is_enabled: true, is_custom: false, description: 'Ir a Recibidos', category: 'navigation' },
    { action_id: 'go_starred', key_combination: 'g s', is_enabled: true, is_custom: false, description: 'Ir a Destacados', category: 'navigation' },
    { action_id: 'go_snoozed', key_combination: 'g b', is_enabled: true, is_custom: false, description: 'Ir a Pospuestos', category: 'navigation' },
    { action_id: 'go_sent', key_combination: 'g t', is_enabled: true, is_custom: false, description: 'Ir a Enviados', category: 'navigation' },
    { action_id: 'go_drafts', key_combination: 'g d', is_enabled: true, is_custom: false, description: 'Ir a Borradores', category: 'navigation' },
    { action_id: 'go_all', key_combination: 'g a', is_enabled: true, is_custom: false, description: 'Ir a Todos', category: 'navigation' },
    { action_id: 'go_spam', key_combination: 'g !', is_enabled: true, is_custom: false, description: 'Ir a Spam', category: 'navigation' },
    { action_id: 'go_trash', key_combination: 'g #', is_enabled: true, is_custom: false, description: 'Ir a Papelera', category: 'navigation' },
    { action_id: 'go_contacts', key_combination: 'g c', is_enabled: true, is_custom: false, description: 'Ir a Contactos', category: 'navigation' },
    { action_id: 'go_tasks', key_combination: 'g k', is_enabled: true, is_custom: false, description: 'Ir a Tareas', category: 'navigation' },
    { action_id: 'go_calendar', key_combination: 'g l', is_enabled: true, is_custom: false, description: 'Ir a Calendario', category: 'navigation' },
    { action_id: 'go_settings', key_combination: 'g ,', is_enabled: true, is_custom: false, description: 'Ir a Configuración', category: 'navigation' },
    { action_id: 'next_email', key_combination: 'j', is_enabled: true, is_custom: false, description: 'Siguiente correo', category: 'navigation' },
    { action_id: 'prev_email', key_combination: 'k', is_enabled: true, is_custom: false, description: 'Correo anterior', category: 'navigation' },
    { action_id: 'open_email', key_combination: 'o', is_enabled: true, is_custom: false, description: 'Abrir correo', category: 'navigation' },
    { action_id: 'back_to_list', key_combination: 'u', is_enabled: true, is_custom: false, description: 'Volver a la lista', category: 'navigation' },
    { action_id: 'next_page', key_combination: 'n', is_enabled: true, is_custom: false, description: 'Página siguiente', category: 'navigation' },
    { action_id: 'prev_page', key_combination: 'p', is_enabled: true, is_custom: false, description: 'Página anterior', category: 'navigation' },

    // Vista
    { action_id: 'expand_all', key_combination: ';', is_enabled: true, is_custom: false, description: 'Expandir conversación', category: 'view' },
    { action_id: 'collapse_all', key_combination: ':', is_enabled: true, is_custom: false, description: 'Colapsar conversación', category: 'view' },
    { action_id: 'refresh', key_combination: 'shift+n', is_enabled: true, is_custom: false, description: 'Actualizar inbox', category: 'view' },
    { action_id: 'toggle_split_view', key_combination: 'ctrl+.', is_enabled: true, is_custom: false, description: 'Alternar vista dividida', category: 'view' },

    // Selección
    { action_id: 'select_all', key_combination: '* a', is_enabled: true, is_custom: false, description: 'Seleccionar todos', category: 'selection' },
    { action_id: 'select_none', key_combination: '* n', is_enabled: true, is_custom: false, description: 'Deseleccionar todos', category: 'selection' },
    { action_id: 'select_read', key_combination: '* r', is_enabled: true, is_custom: false, description: 'Seleccionar leídos', category: 'selection' },
    { action_id: 'select_unread', key_combination: '* u', is_enabled: true, is_custom: false, description: 'Seleccionar no leídos', category: 'selection' },
    { action_id: 'select_starred', key_combination: '* s', is_enabled: true, is_custom: false, description: 'Seleccionar destacados', category: 'selection' },
    { action_id: 'select_unstarred', key_combination: '* t', is_enabled: true, is_custom: false, description: 'Seleccionar no destacados', category: 'selection' },
    { action_id: 'toggle_selection', key_combination: 'x', is_enabled: true, is_custom: false, description: 'Alternar selección', category: 'selection' },

    // Ayuda
    { action_id: 'keyboard_shortcuts', key_combination: '?', is_enabled: true, is_custom: false, description: 'Mostrar atajos', category: 'help' },
  ];

  async getShortcuts(userId: string): Promise<KeyboardShortcut[]> {
    // Primero verificar si el usuario tiene atajos personalizados
    const userShortcuts = await pool.query(
      'SELECT * FROM keyboard_shortcuts WHERE user_id = $1 ORDER BY category, action_id',
      [userId]
    );

    if (userShortcuts.rows.length > 0) {
      return userShortcuts.rows;
    }

    // Si no, devolver los predeterminados con el user_id null
    const defaultShortcuts = await pool.query(
      'SELECT * FROM keyboard_shortcuts WHERE user_id IS NULL ORDER BY category, action_id'
    );

    return defaultShortcuts.rows;
  }

  async getShortcutsByCategory(userId: string): Promise<ShortcutCategory[]> {
    const shortcuts = await this.getShortcuts(userId);

    const categories: Map<string, KeyboardShortcut[]> = new Map();

    for (const shortcut of shortcuts) {
      const cat = shortcut.category || 'other';
      if (!categories.has(cat)) {
        categories.set(cat, []);
      }
      categories.get(cat)!.push(shortcut);
    }

    const categoryNames: Record<string, string> = {
      compose: 'Composición',
      actions: 'Acciones',
      navigation: 'Navegación',
      view: 'Vista',
      selection: 'Selección',
      help: 'Ayuda',
      other: 'Otros'
    };

    return Array.from(categories.entries()).map(([name, shortcuts]) => ({
      name: categoryNames[name] || name,
      shortcuts
    }));
  }

  async initializeUserShortcuts(userId: string): Promise<void> {
    const existing = await pool.query(
      'SELECT COUNT(*) FROM keyboard_shortcuts WHERE user_id = $1',
      [userId]
    );

    if (parseInt(existing.rows[0].count) > 0) {
      return; // Ya inicializado
    }

    // Copiar atajos predeterminados para el usuario
    const defaults = await pool.query(
      'SELECT * FROM keyboard_shortcuts WHERE user_id IS NULL'
    );

    for (const shortcut of defaults.rows) {
      await pool.query(`
        INSERT INTO keyboard_shortcuts (id, user_id, action_id, key_combination, is_enabled, is_custom, description, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        uuidv4(),
        userId,
        shortcut.action_id,
        shortcut.key_combination,
        shortcut.is_enabled,
        false,
        shortcut.description,
        shortcut.category
      ]);
    }

    logger.info(`Keyboard shortcuts initialized for user ${userId}`);
  }

  async updateShortcut(
    userId: string,
    actionId: string,
    updates: { keyCombination?: string; isEnabled?: boolean }
  ): Promise<KeyboardShortcut | null> {
    // Asegurar que el usuario tiene sus propios atajos
    await this.initializeUserShortcuts(userId);

    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.keyCombination !== undefined) {
      // Verificar que la combinación no esté en uso
      const conflict = await pool.query(
        'SELECT action_id FROM keyboard_shortcuts WHERE user_id = $1 AND key_combination = $2 AND action_id != $3',
        [userId, updates.keyCombination, actionId]
      );

      if (conflict.rows.length > 0) {
        throw new Error(`Shortcut "${updates.keyCombination}" already in use by ${conflict.rows[0].action_id}`);
      }

      setClause.push(`key_combination = $${paramCount++}`);
      values.push(updates.keyCombination);
      setClause.push(`is_custom = TRUE`);
    }

    if (updates.isEnabled !== undefined) {
      setClause.push(`is_enabled = $${paramCount++}`);
      values.push(updates.isEnabled);
    }

    if (setClause.length === 0) {
      return this.getShortcutByAction(userId, actionId);
    }

    values.push(actionId, userId);
    const result = await pool.query(`
      UPDATE keyboard_shortcuts SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE action_id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async getShortcutByAction(userId: string, actionId: string): Promise<KeyboardShortcut | null> {
    // Primero buscar personalizado
    let result = await pool.query(
      'SELECT * FROM keyboard_shortcuts WHERE action_id = $1 AND user_id = $2',
      [actionId, userId]
    );

    if (result.rows[0]) return result.rows[0];

    // Luego buscar predeterminado
    result = await pool.query(
      'SELECT * FROM keyboard_shortcuts WHERE action_id = $1 AND user_id IS NULL',
      [actionId]
    );

    return result.rows[0] || null;
  }

  async resetToDefaults(userId: string): Promise<void> {
    await pool.query('DELETE FROM keyboard_shortcuts WHERE user_id = $1', [userId]);
    logger.info(`Keyboard shortcuts reset to defaults for user ${userId}`);
  }

  async createCustomShortcut(
    userId: string,
    actionId: string,
    keyCombination: string,
    description: string,
    category: string = 'custom'
  ): Promise<KeyboardShortcut> {
    // Verificar que la combinación no esté en uso
    const conflict = await pool.query(
      'SELECT action_id FROM keyboard_shortcuts WHERE user_id = $1 AND key_combination = $2',
      [userId, keyCombination]
    );

    if (conflict.rows.length > 0) {
      throw new Error(`Shortcut "${keyCombination}" already in use`);
    }

    const id = uuidv4();
    const result = await pool.query(`
      INSERT INTO keyboard_shortcuts (id, user_id, action_id, key_combination, is_enabled, is_custom, description, category)
      VALUES ($1, $2, $3, $4, TRUE, TRUE, $5, $6)
      RETURNING *
    `, [id, userId, actionId, keyCombination, description, category]);

    logger.info(`Custom shortcut created: ${actionId} = ${keyCombination} for user ${userId}`);
    return result.rows[0];
  }

  async deleteCustomShortcut(userId: string, actionId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM keyboard_shortcuts WHERE user_id = $1 AND action_id = $2 AND is_custom = TRUE',
      [userId, actionId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async exportShortcuts(userId: string): Promise<string> {
    const shortcuts = await this.getShortcuts(userId);
    return JSON.stringify(shortcuts, null, 2);
  }

  async importShortcuts(userId: string, data: string): Promise<number> {
    const shortcuts = JSON.parse(data);
    let imported = 0;

    await this.initializeUserShortcuts(userId);

    for (const shortcut of shortcuts) {
      try {
        await pool.query(`
          UPDATE keyboard_shortcuts
          SET key_combination = $1, is_enabled = $2, is_custom = TRUE
          WHERE user_id = $3 AND action_id = $4
        `, [shortcut.key_combination, shortcut.is_enabled, userId, shortcut.action_id]);
        imported++;
      } catch (error) {
        logger.error(`Error importing shortcut ${shortcut.action_id}:`, error);
      }
    }

    return imported;
  }

  parseKeyCombination(combination: string): { key: string; modifiers: string[] } {
    const parts = combination.toLowerCase().split('+').map(p => p.trim());
    const modifiers: string[] = [];
    let key = '';

    for (const part of parts) {
      if (['ctrl', 'alt', 'shift', 'meta', 'cmd'].includes(part)) {
        modifiers.push(part);
      } else {
        key = part;
      }
    }

    return { key, modifiers };
  }
}

export const keyboardShortcutsService = new KeyboardShortcutsService();
