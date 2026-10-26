
const db = require('./db');

async function testConnection() {
  try {
    const connection = await db.getConnection();
    console.log('SUCCESS: Connected to MySQL!');
    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables:', rows);
    connection.release();
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
  } finally {
    await db.end();
  }
}

testConnection();
