import { Router } from 'express';
import { query, getClient } from '../database.js';
import { verifyToken } from '../middleware/auth.js';
import { createError } from '../utils/errors.js';

const router = Router();

router.use(verifyToken);

// POST /batch - Process offline batch actions
router.post('/batch', async (req, res, next) => {
  const client = await getClient();

  try {
    const { actions } = req.body;
    const { userId } = req.user;

    if (!Array.isArray(actions) || actions.length === 0) {
      throw createError('Actions array is required', 400);
    }

    if (actions.length > 100) {
      throw createError('Maximum 100 actions per batch', 400);
    }

    const results = [];
    await client.query('BEGIN');

    for (const action of actions) {
      const { type, entity, data, clientId } = action;

      if (entity !== 'checklist') {
        results.push({
          clientId,
          success: false,
          error: `Unsupported entity: ${entity}`,
        });
        continue;
      }

      try {
        if (type === 'create') {
          const result = await client.query(
            `INSERT INTO checklists (owner_id, property_address, form_data, notes, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              userId,
              data.propertyAddress || null,
              JSON.stringify(data.formData || {}),
              data.notes || null,
              data.status || 'draft',
            ]
          );

          results.push({
            clientId,
            success: true,
            serverId: result.rows[0].id,
            data: result.rows[0],
          });
        } else if (type === 'update') {
          if (!data.id) {
            results.push({ clientId, success: false, error: 'Missing id for update' });
            continue;
          }

          const result = await client.query(
            `UPDATE checklists
             SET property_address = COALESCE($1, property_address),
                 form_data = COALESCE($2, form_data),
                 notes = COALESCE($3, notes),
                 status = COALESCE($4, status),
                 completed_at = CASE WHEN $4 = 'completed' THEN NOW() ELSE completed_at END,
                 updated_at = NOW()
             WHERE id = $5 AND owner_id = $6
             RETURNING *`,
            [
              data.propertyAddress || null,
              data.formData ? JSON.stringify(data.formData) : null,
              data.notes || null,
              data.status || null,
              data.id,
              userId,
            ]
          );

          if (result.rows.length === 0) {
            results.push({ clientId, success: false, error: 'Not found or access denied' });
          } else {
            results.push({ clientId, success: true, data: result.rows[0] });
          }
        } else if (type === 'delete') {
          if (!data.id) {
            results.push({ clientId, success: false, error: 'Missing id for delete' });
            continue;
          }

          const result = await client.query(
            `UPDATE checklists SET status = 'archived', updated_at = NOW()
             WHERE id = $1 AND owner_id = $2
             RETURNING id`,
            [data.id, userId]
          );

          if (result.rows.length === 0) {
            results.push({ clientId, success: false, error: 'Not found or access denied' });
          } else {
            results.push({ clientId, success: true });
          }
        } else {
          results.push({ clientId, success: false, error: `Unknown action type: ${type}` });
        }
      } catch (err) {
        results.push({ clientId, success: false, error: err.message });
      }
    }

    await client.query('COMMIT');
    res.json({ results });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
