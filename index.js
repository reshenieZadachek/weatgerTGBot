const express = require('express');
const { sequelize } = require('./db');
const { startBot } = require('./bot');
const { Log } = require('./db');
const { Op } = require('sequelize');

const app = express();

// Запуск бота
startBot();

// Маршруты REST API
app.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    let whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      whereClause.createdAt = { [Op.gte]: startDate };
    } else if (endDate) {
      whereClause.createdAt = { [Op.lte]: endDate };
    }

    let options = {
      where: whereClause,
      order: [['createdAt', 'DESC']]
    };

    // Применяем пагинацию, если указаны параметры page и limit
    if (!isNaN(page) && !isNaN(limit)) {
      options.limit = limit;
      options.offset = (page - 1) * limit;
    }

    const { count, rows } = await Log.findAndCountAll(options);

    res.json({
      totalItems: count,
      totalPages: limit ? Math.ceil(count / limit) : 1,
      currentPage: limit ? page : 1,
      logs: rows
    });
  } catch (error) {
    //Выводим всю ошибку в консоль для логирования и отлова ошибок и выводим объяснение ошибки пользователь
    console.error('Ошибка при получении логов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.get('/logs/:user_id', async (req, res) => {
  const userId = req.params.user_id;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    let whereClause = { userId: userId };
    if (startDate && endDate) {
      whereClause.createdAt = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      whereClause.createdAt = { [Op.gte]: startDate };
    } else if (endDate) {
      whereClause.createdAt = { [Op.lte]: endDate };
    }

    const { count, rows } = await Log.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      logs: rows
    });
  } catch (error) {
    //Выводим всю ошибку в консоль для логирования и отлова ошибок и выводим объяснение ошибки пользователь
    console.error('Ошибка при получении логов для пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Запуск сервера Express
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер был запущен на порте ${PORT}`);
});