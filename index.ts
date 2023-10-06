import TelegramBot from 'node-telegram-bot-api';
import { textUserHandlers } from './users/handlers';
import { textReminderHandlers, plainReminderHandlers, pollAnswerReminderHandlers } from './reminder/handlers';
import dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.TOKEN as string, { polling: true });

textUserHandlers.forEach((handler) => {
    bot.onText(handler.command, handler.handler(bot));
});

textReminderHandlers.forEach((handler) => {
    bot.onText(handler.command, handler.handler(bot));
});

plainReminderHandlers.forEach((handler) => {
    bot.on('message', handler.handler(bot));
});

pollAnswerReminderHandlers.forEach((handler) => {
    bot.on('callback_query', handler.handler(bot));
});
