const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { Log, UserSettings } = require('./db');
require('dotenv').config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const weatherApiKey = process.env.OPENWEATHERMAP_API_KEY;

const bot = new TelegramBot(botToken, { polling: true });

// Функция для логирования запросов
async function logRequest(userId, command, response) {
  try {
    await Log.create({ userId, command, response });
  } catch (error) {
    console.error('Ошибка при логировании в PostgreSQL:', error);
  }
}

// Обработчики команд Telegram бота
function startBot() {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const response = 'Привет! Я бот погоды, созданный в качестве теста для компании bobrAi. Используйте команду /weather <город> для получения информации о погоде.';
    bot.sendMessage(chatId, response);
    logRequest(msg.from.id, '/start', response);
  });

  bot.onText(/\/weather(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const requestedCity = match[1];

    let city = requestedCity;

    try {
      if (!city) {
        const userSettings = await UserSettings.findOne({ where: { userId: userId } });

        if (userSettings && userSettings.city) {
          city = userSettings.city;
        } else {
          const response = 'Пожалуйста, укажите город или установите его по умолчанию используя команду\n/setcity <город>.';
          bot.sendMessage(chatId, response);
          logRequest(userId, '/weather', response);
          return;
        }
      }

      const weather = await getWeather(city);
      const response = formatWeatherResponse(weather);
      bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      logRequest(userId, `/weather ${city}`, response);
    } catch (error) {
      console.error('Ошибка:', error.message);
      const errorResponse = `Извините, произошла ошибка при получении информации о погоде:\n${error.message}`;
      bot.sendMessage(chatId, errorResponse);
      logRequest(userId, `/weather ${city}`, errorResponse);
    }
  });

  bot.onText(/\/setcity(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const city = match[1];

    if (!city) {
      const response = 'Пожалуйста, укажите город. Пример использования:\n/setcity Москва';
      bot.sendMessage(chatId, response);
      logRequest(userId, '/setcity', response);
      return;
    }

    try {
      const [userSettings, created] = await UserSettings.findOrCreate({
        where: { userId: userId },
        defaults: { city: city }
      });

      if (!created) {
        userSettings.city = city;
        await userSettings.save();
      }

      const response = `Город по умолчанию установлен на: ${city}`;
      bot.sendMessage(chatId, response);
      logRequest(userId, `/setcity ${city}`, response);
    } catch (error) {
      console.error('Ошибка при установке города:', error);
      const errorResponse = `Произошла ошибка при установке города: ${error.message}`;
      bot.sendMessage(chatId, errorResponse);
      logRequest(userId, `/setcity ${city}`, errorResponse);
    }
  });

  bot.onText(/\/clearcity/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const userSettings = await UserSettings.findOne({ where: { userId: userId } });
      if (userSettings) {
        await userSettings.destroy();
        const response = 'Ваш город по умолчанию был удалён.';
        bot.sendMessage(chatId, response);
        logRequest(userId, '/clearcity', response);
      } else {
        const response = 'У вас нет сохранённого города.';
        bot.sendMessage(chatId, response);
        logRequest(userId, '/clearcity', response);
      }
    } catch (error) {
      console.error('Ошибка при удалении города:', error);
      const errorResponse = `Произошла ошибка при удалении города: ${error.message}`;
      bot.sendMessage(chatId, errorResponse);
      logRequest(userId, '/clearcity', errorResponse);
    }
  });

  console.log('Бот запущен и ожидает сообщений...');
}

// Вспомогательные функции
async function getWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherApiKey}&units=metric&lang=ru`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Ошибка в getWeather:', error.message);
    if (error.response) {
      console.error('Данные ответа:', error.response.data);
      console.error('Статус ответа:', error.response.status);
    }
  }
}

function formatWeatherResponse(weather) {
  return `
*Погода в городе ${weather.name}:*

🌡 Температура: ${weather.main.temp}°C
🔆 Ощущается как: ${weather.main.feels_like}°C
☁️ Погодные условия: ${weather.weather[0].description}
💧 Влажность: ${weather.main.humidity}%
💨 Скорость ветра: ${weather.wind.speed} м/с

_Этот бот создан в качестве теста для компании bobrAi._
  `;
}

module.exports = { startBot };