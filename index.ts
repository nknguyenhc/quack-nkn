import TelegramBot, { Message } from 'node-telegram-bot-api';
import { plainUserHandlers, pollUserHandlers, textUserHandlers } from './users/handlers';
import { textReminderHandlers, plainReminderHandlers, pollAnswerReminderHandlers } from './reminder/handlers';
import reminderStartJob from './reminder/start';
import { trackPlainHandler, trackPollHandler, trackTextHandlers } from './tracker/handlers';
import dotenv from 'dotenv';
import { User } from './users/db';
import { Reminder } from './reminder/db';
import { Tracker } from './tracker/db';
import trackStartJob from './tracker/start';
import Logger from './logging/logger';
import express from "express";
import pug from "pug";
import { appendFileSync, readFile, readFileSync, readdir, writeFile, writeFileSync } from "fs";

dotenv.config();

function main() {
    const bot = new TelegramBot(process.env.TOKEN as string, { polling: true });

    reminderStartJob(bot);
    trackStartJob(bot);

    textUserHandlers.forEach((handler) => {
        bot.onText(handler.command, handler.handler(bot));
    });

    plainUserHandlers.forEach((handler) => {
        bot.on("message", handler.handler(bot));
    });

    pollUserHandlers.forEach((handler) => {
        bot.on("callback_query", handler.handler(bot));
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

    Logger.getInfoLogger().log("Bot is ready to receive requests.");
}

function serve() {
    const app = express();

    compilePugFiles();
    combineFiles('scripts', 'static/index.js');
    combineFiles('styles', 'static/index.css');

    app.use('/static', express.static('static'));

    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/templates/index.html');
    })

    app.listen(process.env.PORT, () => Logger.getInfoLogger().log(`Server is listening on port ${process.env.PORT}`))
}

function compilePugFiles() {
    const pugs = {
        'index.pug': 'index.html',
    };
    for (const pugFile of Object.keys(pugs)) {
        const compiledFunction = pug.compileFile(`pug/${pugFile}`);
        writeFile(`templates/${pugs[pugFile]}`, compiledFunction(), (err) => {
            if (err) {
                Logger.getErrorLogger().log(`Failed to write HTML file ${pugs[pugFile]}`);
                Logger.getDebugLogger().log(err);
            } else {
                Logger.getInfoLogger().log(`Successfully compiled ${pugFile} to ${pugs[pugFile]}`);
            }
        });
    }
}

function combineFiles(folder: string, outFile: string) {
    readdir(folder, (err, files) => {
        if (err) {
            Logger.getErrorLogger().log(`Failed to read "${folder}" directory.`);
            Logger.getDebugLogger().log(err);
        } else {
            Logger.getInfoLogger().log(`Reading files from "${folder}" directory.`);
            writeFileSync(outFile, "");
            files.forEach(filename => {
                const data = readFileSync(`${folder}/${filename}`);
                appendFileSync(outFile, data);
            });
            Logger.getInfoLogger().log(`Successfully compiled all files from "${folder}" into "${outFile}"`);
        }
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
        migrate();
        break;
    case 'clear':
        clear();
        break;
    case 'bot':
        main();
        break;
    case 'serve':
        serve();
        break;
    case 'both':
        main();
        serve();
        break;
}
