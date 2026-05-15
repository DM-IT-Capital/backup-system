const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM servers');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { name, ipAddress, customerId, environment, hypervisor } = req.body;
      const result = await pool.query(
        'INSERT INTO servers (name, ip_address, customer_id, environment, hypervisor, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, ipAddress, customerId, environment, hypervisor, 'pending']
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/:id/install-agent', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('UPDATE servers SET status = $1 WHERE id = $2 RETURNING *', ['online', id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Server not found' });
      res.json({ message: 'Agent installation initiated', server: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
