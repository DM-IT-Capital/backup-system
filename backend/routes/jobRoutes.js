const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT jobs.*, servers.name as server_name FROM jobs
        JOIN servers ON jobs.server_id = servers.id
      `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { name, type, serverId, customerId } = req.body;
      const result = await pool.query(
        'INSERT INTO jobs (name, type, server_id, customer_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, type, serverId, customerId, 'created']
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/:id/run', async (req, res) => {
    try {
      const { id } = req.params;
      const updateResult = await pool.query('UPDATE jobs SET status = $1 WHERE id = $2 RETURNING *', ['running', id]);
      if (updateResult.rows.length === 0) return res.status(404).json({ error: 'Job not found' });

      // Placeholder: start actual job
      setTimeout(async () => {
        await pool.query('UPDATE jobs SET status = $1 WHERE id = $2', ['completed', id]);
      }, 1000);

      res.json({ message: 'Job started', job: updateResult.rows[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
