const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const serverRoutes = require('./routes/serverRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/backup_system', // Replace with your Supabase URL
});

app.use('/api/servers', serverRoutes(pool));
app.use('/api/jobs', jobRoutes(pool));

app.get('/', (req, res) => {
  res.json({ message: 'Backup system API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});