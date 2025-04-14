import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Inicializar la base de datos
export const initDB = async () => {
  const db = await open({
    filename: './clientes.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT UNIQUE,
      nombre TEXT,
      telefono TEXT,
      obraSocial TEXT
    );
  `);

  return db;
};

// ✅ Función para obtener todos los clientes
export const getAllClientes = async () => {
  const db = await initDB();
  const clientes = await db.all('SELECT nombre, telefono, obraSocial FROM clientes');
  await db.close(); // Cerramos la conexión
  return clientes;
};

// ✅ Función para buscar un cliente por su userId
export const getClienteByUserId = async (userId: string) => {
  const db = await initDB();
  const cliente = await db.get('SELECT * FROM clientes WHERE userId = ?', userId);
  await db.close();
  return cliente;
};



// ✅ Función para guardar o actualizar cliente
export const saveCliente = async (userId: string, nombre: string, telefono: string, obraSocial: string) => {
  const db = await initDB();
  await db.run(
    `INSERT INTO clientes (userId, nombre, telefono, obraSocial)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET nombre=excluded.nombre, telefono=excluded.telefono, obraSocial=excluded.obraSocial;`,
    [userId, nombre, telefono, obraSocial]
  );
  await db.close();
};