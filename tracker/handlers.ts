import TelegramBot, { Message } from 'node-telegram-bot-api';
import { PlainHandler, TextHandler } from '../utils/types';
import UserStates from '../utils/states';
import { launch } from 'puppeteer';
import { getRandomString } from '../utils/primitives';
import { unlink } from 'fs';
import { frequencyPoll } from './data';
import { TrackMemory } from './temp';

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
                + "In your message, send the address of the website only. Do not add any extra text.\n"
                + "Please take note that I can only track websites that are publicly available and is not blocked by Chrome "
                + "(i.e. does not require logging in, no malicious content, no onion website)");
        }
    },
};

const trackAddressHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_ADD) {
            const link = msg.text;
            bot.sendMessage(chatId, "Alright, give me a second.");
            TrackMemory.addUser(chatId);
            TrackMemory.setLink(chatId, link);

            const browser = await launch();
            const page = await browser.newPage();
            page.setViewport({
                width: 1440,
                height: 715,
            });

            try {
                await page.goto(link);
            } catch (e) {
                bot.sendMessage(chatId, "Oops, the URL you sent me seems to be invalid, please send me the correct link.");
                return;
            }

            const filename = getRandomString();
            await page.screenshot({
                path: './media/' + filename + '.jpg',
            });
            browser.close();

            bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                caption: "Is this the site that you want to track?",
            }).then(() => {
                unlink('media/' + filename + '.jpg', (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
            });
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_CONFIRM);
        }
    },
};

const trackConfirmHandler: PlainHandler = {
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_CONFIRM) {
            const reply = msg.text.toLowerCase().trim();
            if (reply === 'yes' || reply === 'y') {
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_SELECTOR), 100);
                bot.sendMessage(chatId, "Alright, do you wish to scroll down to a particular section?\n"
                        + "If you do not need me to scroll down, simply type \"top\"\n"
                        + "Otherwise, give me the query selector such that when I run `document.querySelectorAll(yourQuerySelector)`, "
                        + "the HTML element should be in the result list.", {
                            parse_mode: "Markdown",
                        });
            } else if (reply === 'no' || reply === 'n') {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                TrackMemory.deleteUser(chatId);
                bot.sendMessage(chatId, "Cancelled adding the website tracker. "
                        + "If you believe the above was a bug, please contact my boss at nknguyenhc@gmail.com");
            } else {
                bot.sendMessage(chatId, "Please confirm with either \"yes\" or \"no\"");
            }
        }
    }
};

const trackSelectorHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_SELECTOR) {
            const selector = msg.text;
            bot.sendMessage(chatId, "Alright, give me a second.");
            
            const link = TrackMemory.getLink(chatId);
            const browser = await launch();
            const page = await browser.newPage();
            page.setViewport({
                width: 1440,
                height: 715,
            });
            await page.goto(link);
            const elements = await page.$$(selector);
            console.log(elements);

            if (elements.length > 0) {
                await page.evaluate((element) => {
                    element.scrollIntoView();
                }, elements[0]);
                const filename = getRandomString();
                await page.screenshot({
                    path: './media/' + filename + '.jpg',
                });
                bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                    caption: "Is this the section you want to track?",
                }).then(() => {
                    unlink('media/' + filename + '.jpg', (err) => {
                        if (err) {
                            console.log(err);
                        }
                    });
                });
            }

            browser.close();
        }
    }
};

export const trackTextHandlers: Array<TextHandler> = [
    trackHandler,
    trackAddHandler,
];

export const trackPlainHandler: Array<PlainHandler> = [
    trackAddressHandler,
    trackConfirmHandler,
    trackSelectorHandler,
];
