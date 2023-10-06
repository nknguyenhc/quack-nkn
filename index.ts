import TelegramBot from 'node-telegram-bot-api';
import { textUserHandlers } from './users/handlers';
import dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.TOKEN as string, { polling: true });

textUserHandlers.forEach((handler) => {
    bot.onText(handler.command, handler.handler(bot));
})
