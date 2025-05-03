import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({//CADENa conexion
  host: process.env.DB_HOST || 'localhost',//ip
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'alexis',
  database: process.env.DB_DATABASE || 'taskal'
});

export default pool;