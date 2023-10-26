import TelegramBot, { Message } from 'node-telegram-bot-api';
import { plainUserHandlers, textUserHandlers } from './users/handlers';
import { textReminderHandlers, plainReminderHandlers, pollAnswerReminderHandlers } from './reminder/handlers';
import reminderStartJob from './reminder/start';
import { trackPlainHandler, trackPollHandler, trackTextHandlers } from './tracker/handlers';
import dotenv from 'dotenv';
import { User } from './users/db';
import { Reminder } from './reminder/db';
import { Tracker } from './tracker/db';

dotenv.config();

function main() {
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
    });

    trackPollHandler.forEach((handler) => {
        bot.on('callback_query', handler.handler(bot));
    });
}

async function migrate() {
    await User.sync({ alter: true });
    await Reminder.sync({ alter: true });
    await Tracker.sync({ alter: true });
}

async function clear() {
    await User.sync({ force: true });
    await Reminder.sync({ force: true });
    await Tracker.sync({ force: true });
}

switch (process.argv[2]) {
    case 'migrate':
        migrate()
        break;
    case 'clear':
        clear();
        break;
    case 'bot':
        main();
        break;
}
