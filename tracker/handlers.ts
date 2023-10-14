import TelegramBot, { Message } from 'node-telegram-bot-api';
import { PlainHandler, TextHandler } from '../utils/types';
import UserStates from '../utils/states';
import { launch } from 'puppeteer';
import { getRandomString } from '../utils/primitives';

const trackHandler: TextHandler = {
    command: /^\/track$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.NORMAL) {
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_START);
            bot.sendMessage(chatId, "What do you wish to do?\n"
                + "/add - add a new website tracker\n"
                + "/list - view your website trackers\n"
                + "/edit - edit a website tracker\n"
                + "/delete - delete a website tracker\n");
        }
    },
};

const trackAddHandler: TextHandler = {
    command: /^\/add$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_START) {
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_ADD);
            bot.sendMessage(chatId, "Alright, give me the address of the website that you wish to track.\n"
                + "In your message, send the address of the website only. Do not add any extra text.");
        }
    },
};

const trackAddressHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_ADD) {
            bot.sendMessage(chatId, "Alright, give me a second.");
            const link = msg.text;
            const browser = await launch();
            const page = await browser.newPage();
            page.setViewport({
                width: 1440,
                height: 715,
            });
            await page.goto(link);
            const filename = getRandomString();
            await page.screenshot({
                path: './media/' + filename + '.jpg',
            });
            browser.close();
            bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                caption: "Is this the site that you want to track?",
            });
        }
    },
}

export const trackTextHandlers: Array<TextHandler> = [
    trackHandler,
    trackAddHandler,
];

export const trackPlainHandler: Array<PlainHandler> = [
    trackAddressHandler,
];
