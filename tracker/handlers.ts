import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { PlainHandler, PollAnswerHandler, TextHandler } from '../utils/types';
import UserStates from '../utils/states';
import { launch } from 'puppeteer';
import { getRandomString } from '../utils/primitives';
import { unlink } from 'fs';
import { confirmErrorMessage, dailyPoll, frequencyPoll, onceQuestion, weeklyPoll } from './data';
import { TrackMemory } from './temp';
import { FrequencyType } from '../utils/schedule';

const mainBrowser = launch();

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
            const link = msg.text!;
            bot.sendMessage(chatId, "Alright, give me a second.");
            TrackMemory.addUser(chatId);
            TrackMemory.setLink(chatId, link);

            const browser = await mainBrowser;
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
            page.close();

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
            const reply = msg.text!.toLowerCase().trim();
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
                bot.sendMessage(chatId, confirmErrorMessage);
            }
        }
    }
};

const trackSelectorHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_SELECTOR) {
            const selector = msg.text!;
            bot.sendMessage(chatId, "Alright, give me a second.");
            
            const link = TrackMemory.getLink(chatId);
            const browser = await mainBrowser;
            const page = await browser.newPage();
            page.setViewport({
                width: 1440,
                height: 715,
            });
            await page.goto(link);
            const elements = await page.$$(selector);

            if (elements.length > 0) {
                await page.evaluate((element) => {
                    element.scrollIntoView();
                }, elements[0]);
                const filename = getRandomString();
                await page.screenshot({
                    path: './media/' + filename + '.jpg',
                });
                TrackMemory.setSelector(chatId, selector);
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_SELECTOR_CONFIRM), 100);
                bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                    caption: "Is this the section you want to track?",
                }).then(() => {
                    unlink('media/' + filename + '.jpg', (err) => {
                        if (err) {
                            console.log(err);
                        }
                    });
                });
            } else {
                bot.sendMessage(chatId, "I did not manage to find any HTML element with your selector. "
                        + "Please send me the correct selector.");
            }

            page.close();
        }
    },
};

const trackSelectorConfirmHandler: PlainHandler = {
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_SELECTOR_CONFIRM) {
            const reply = msg.text!.toLowerCase().trim();
            if (reply === 'yes' || reply === 'y') {
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_CAPTION), 100);
                bot.sendMessage(chatId, 'What caption do you wish to put for your tracker?');
            } else if (reply === 'no' || reply === 'n') {
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_SELECTOR), 100);
                bot.sendMessage(chatId, "Alright, can you give me the correct query selector?");
            } else {
                bot.sendMessage(chatId, confirmErrorMessage);
            }
        }
    },
};

const trackCaptionHandler: PlainHandler = {
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_CAPTION) {
            const caption = msg.text!;
            TrackMemory.setCaption(chatId, caption);
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_FREQUENCY);
            bot.sendMessage(chatId, frequencyPoll.question, {
                reply_markup: {
                    inline_keyboard: frequencyPoll.options,
                },
            }).then(msg => {
                UserStates.setUserQuestionId(chatId, msg.message_id);
            });
        }
    },
};

const trackFrequencyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_FREQUENCY
                && query.message!.text === frequencyPoll.question) {
            const messageId = query.message!.message_id;
            const selectedOption: FrequencyType = query.data as FrequencyType;
            TrackMemory.setFrequency(chatId, selectedOption);

            bot.editMessageText(
                `Alright, I will send you screenshots ${selectedOption}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            switch (selectedOption) {
                case 'daily':
                    UserStates.setUserState(chatId, UserStates.STATE.TRACK_DAILY);
                    bot.sendMessage(chatId, dailyPoll.question, {
                        reply_markup: {
                            inline_keyboard: dailyPoll.options,
                        },
                    }).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
                case 'weekly':
                    UserStates.setUserState(chatId, UserStates.STATE.TRACK_WEEKLY);
                    bot.sendMessage(chatId, weeklyPoll.question, {
                        reply_markup: {
                            inline_keyboard: weeklyPoll.options,
                        },
                    }).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
                case 'once':
                    UserStates.setUserState(chatId, UserStates.STATE.TRACK_ONCE);
                    bot.sendMessage(chatId, onceQuestion).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
            }
        }
    },
};

export const trackTextHandlers: Array<TextHandler> = [
    trackHandler,
    trackAddHandler,
];

export const trackPlainHandler: Array<PlainHandler> = [
    trackAddressHandler,
    trackConfirmHandler,
    trackSelectorHandler,
    trackSelectorConfirmHandler,
    trackCaptionHandler,
];

export const trackPollHandler: Array<PollAnswerHandler> = [
    trackFrequencyHandler,
];
