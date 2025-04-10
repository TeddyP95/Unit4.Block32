const pg = require('pg')
const express = require('express')
const morgan = require('morgan')

// Create Express app
const app = express()

// Middleware
app.use(express.json())
app.use(morgan('dev'))

// Database connection
const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/flavors_db')

// Routes
// GET /api/flavors - Returns all flavors
app.get('/api/flavors', async (req, res, next) => {
  try {
    const SQL = 'SELECT * FROM flavors ORDER BY created_at DESC'
    const result = await client.query(SQL)
    res.send(result.rows)
  } catch (error) {
    next(error)
  }
})

// GET /api/flavors/:id - Returns a single flavor
app.get('/api/flavors/:id', async (req, res, next) => {
  try {
    const SQL = 'SELECT * FROM flavors WHERE id=$1'
    const result = await client.query(SQL, [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).send('Flavor not found')
    }
    res.send(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// POST /api/flavors - Creates a new flavor
app.post('/api/flavors', async (req, res, next) => {
  try {
    const { name, is_favorite } = req.body
    const SQL = `
      INSERT INTO flavors(name, is_favorite) 
      VALUES($1, $2) 
      RETURNING *
    `
    const result = await client.query(SQL, [name, is_favorite])
    res.status(201).send(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// DELETE /api/flavors/:id - Deletes a flavor
app.delete('/api/flavors/:id', async (req, res, next) => {
  try {
    const SQL = 'DELETE FROM flavors WHERE id=$1'
    await client.query(SQL, [req.params.id])
    res.sendStatus(204)
  } catch (error) {
    next(error)
  }
})

// PUT /api/flavors/:id - Updates a flavor
app.put('/api/flavors/:id', async (req, res, next) => {
  try {
    const { name, is_favorite } = req.body
    const SQL = `
      UPDATE flavors 
      SET name=$1, is_favorite=$2, updated_at=CURRENT_TIMESTAMP 
      WHERE id=$3 
      RETURNING *
    `
    const result = await client.query(SQL, [name, is_favorite, req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).send('Flavor not found')
    }
    res.send(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send('Server Error')
})

// Initialize function
const init = async () => {
  try {
    await client.connect()
    
    // Drop and recreate table
    await client.query(`
      DROP TABLE IF EXISTS flavors;
      CREATE TABLE flavors(
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Seed data
    await client.query(`
      INSERT INTO flavors(name, is_favorite) VALUES
      ('Vanilla', true),
      ('Chocolate', true),
      ('Strawberry', false),
      ('Mint Chocolate Chip', true);
    `)

    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`)
    })
  } catch (error) {
    console.error('Error during initialization:', error)
    process.exit(1)
  }
}

// Start the application
init()