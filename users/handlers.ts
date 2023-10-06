import TelegramBot, { Message } from "node-telegram-bot-api";
import { User } from './db';
import { TextHandler } from '../types/types';

const startHandler: TextHandler = {
    command: /\/start/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId: number = msg.chat.id;
        await User.findOrCreate({
            where: {
                chatId: chatId,
            },
        });
        bot.sendMessage(chatId, 'Hello! I am your TypeScript Telegram bot.');
    }
};

export const textUserHandlers: Array<TextHandler> = [
    startHandler,
];
