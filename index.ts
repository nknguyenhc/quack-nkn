import TelegramBot, { Message } from 'node-telegram-bot-api';
import { plainUserHandlers, textUserHandlers } from './users/handlers';
import { textReminderHandlers, plainReminderHandlers, pollAnswerReminderHandlers } from './reminder/handlers';
import reminderStartJob from './reminder/start';
import { trackPlainHandler, trackTextHandlers } from './tracker/handlers';
import dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.TOKEN as string, { polling: true });

reminderStartJob(bot);

textUserHandlers.forEach((handler) => {
    bot.onText(handler.command, handler.handler(bot));
});

plainUserHandlers.forEach((handler) => {
    bot.on("message", handler.handler(bot));
});

textReminderHandlers.forEach((handler) => {
    bot.onText(handler.command, handler.handler(bot));
});

plainReminderHandlers.forEach((handler) => {
    bot.on('message', (msg: Message) => {
        if (msg.text.startsWith('/')) {
            return;
        }
        handler.handler(bot)(msg);
    });
});

pollAnswerReminderHandlers.forEach((handler) => {
    bot.on('callback_query', handler.handler(bot));
});

trackTextHandlers.forEach((handler) => {
    bot.onText(handler.command, handler.handler(bot));
});

trackPlainHandler.forEach((handler) => {
    bot.on("message", (msg: Message) => {
        if (msg.text.startsWith('/')) {
            return;
        }
        handler.handler(bot)(msg);
    });
})
