const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Данные для подключения к Postgres бд
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const dbHost = process.env.DB_HOST;

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  dialect: 'postgres',
  logging: false
});

// Определяем модели
const Log = sequelize.define('Log', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  command: {
    type: DataTypes.STRING,
    allowNull: false
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW
  }
});
const UserSettings = sequelize.define('UserSettings', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// Синхронизация моделей с бд
sequelize.sync().then(() => console.log('Таблицы успешно созданы')).catch(err => console.error('Ошибка при создании таблиц:', err));

module.exports = { sequelize, Log, UserSettings };