import TelegramBot, { Message } from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token: string = process.env.TOKEN as string;

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg: Message) => {
    const chatId: number = msg.chat.id;
    bot.sendMessage(chatId, 'Hello! I am your TypeScript Telegram bot.');
});