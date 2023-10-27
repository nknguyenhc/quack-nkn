import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { PlainHandler, PollAnswerHandler, TextHandler } from '../utils/types';
import UserStates from '../utils/states';
import { launch, ElementHandle, NodeFor } from 'puppeteer';
import { getRandomString, numberToTime, parseDateTime, weeklyNumberToString } from '../utils/primitives';
import { unlink } from 'fs';
import { confirmErrorMessage, dailyPoll, frequencyPoll, onceQuestion, weeklyPoll } from './data';
import { TrackMemory } from './temp';
import { FrequencyType, setReminder } from '../utils/schedule';
import { Tracker } from './db';

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
            page.close();

            bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                caption: "Is this the site that you want to track?",
            }).then(() => {
                unlink('media/' + filename + '.jpg', () => {});
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
                        + "If you do not need me to scroll down, simply type \"top\".\n"
                        + "If you wish me to scroll down, give me the number of pixels that I need to scroll down. "
                        + "For your reference 400 pixels are around half the height of your browser.\n"
                        + "For advanced user, you may use query selector. /selector for more info.");
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

const querySelectorInfoHandler: TextHandler = {
    command: /^\/selector$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_SELECTOR) {
            bot.sendMessage(chatId, "The query selector must be such that when I run `document.querySelectorAll(yourQuerySelector)` "
                    + "in the javascript console on the page, the HTML element should be in the result list. "
                    + "For example, if you give me \"div.box\", I will find all HTML div elements with class name \"box\", "
                    + "and your element must be in the list.", {
                        parse_mode: "Markdown",
                    });
        }
    }
}

const trackSelectorHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_SELECTOR) {
            const selector = msg.text!;
            bot.sendMessage(chatId, "Alright, give me a second.");

            if (selector === 'top') {
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_CAPTION), 100);
                bot.sendMessage(chatId, "Ok, I will track the website at the top.\n"
                        + "What caption do you wish to put for your tracker?");
                return;
            }
            
            const link = TrackMemory.getLink(chatId);
            const browser = await launch();
            const page = await browser.newPage();
            page.setViewport({
                width: 1440,
                height: 715,
            });
            
            try {
                await page.goto(link);
            } catch (e) {
                bot.sendMessage(chatId, "Oops, looks like the page has just been removed. "
                        + "Please try adding another tracker.");
                TrackMemory.deleteUser(chatId);
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            const tryNumber = Number(selector);
            if (!isNaN(tryNumber)) {
                await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                const filename = getRandomString();
                await page.screenshot({
                    path: './media/' + filename + '.jpg',
                });
                TrackMemory.setPixelCount(chatId, tryNumber);
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_SELECTOR_CONFIRM), 100);
                bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                    caption: "Is this the section you want to track?",
                }).then(() => {
                    unlink('media/' + filename + ".jpg", () => {});
                });
                return;
            }

            const elements = await page.$$(selector);

            if (elements.length === 1) {
                await page.evaluate((element: ElementHandle<NodeFor<string>>) => {
                    element.scrollIntoView();
                }, elements[0]);
                await page.evaluate('window.scrollBy(0, -150)');
                const filename = getRandomString();
                await page.screenshot({
                    path: './media/' + filename + '.jpg',
                });
                TrackMemory.setSelector(chatId, selector);
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_SELECTOR_CONFIRM), 100);
                bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                    caption: "Is this the section you want to track?",
                }).then(() => {
                    unlink('media/' + filename + '.jpg', () => {});
                });
            } else if (elements.length > 1) {
                TrackMemory.setSelector(chatId, selector);
                TrackMemory.setSelectorCount(chatId, elements.length);
                UserStates.setUserState(chatId, UserStates.STATE.TRACK_INDEX);
                bot.sendMessage(chatId, "Looks like there are many HTML elements matching your query. "
                        + "What is the index of the element? You can obtain the index of the element "
                        + `by running \`document.querySelectorAll(${selector})\` in browser `
                        + "and obtain the index of the item in the result list. "
                        + "Please give me zero-based index.", {
                            parse_mode: "Markdown",
                        });
            } else {
                bot.sendMessage(chatId, "I did not manage to find any HTML element with your selector. "
                        + "Please send me the correct selector, or the number of pixels to scroll down.");
            }

            page.close();
        }
    },
};

const trackSelectorIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_INDEX) {
            const index = Number(msg.text);
            const range = TrackMemory.getSelectorCount(chatId);
            if (isNaN(index) || index >= range || index < 0) {
                bot.sendMessage(chatId, `Invalid index, index should be between 0 and ${range - 1} inclusive.`);
                return;
            }

            TrackMemory.setIndex(chatId, index);
            const selector = TrackMemory.getSelector(chatId);
            const link = TrackMemory.getLink(chatId);
            const browser = await launch();
            const page = await browser.newPage();
            page.setViewport({
                width: 1440,
                height: 715,
            });
            
            try {
                await page.goto(link);
            } catch (e) {
                bot.sendMessage(chatId, "Oops, looks like the page has just been removed. "
                        + "Please try adding another tracker.");
                TrackMemory.deleteUser(chatId);
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            const elements = await page.$$(selector);

            if (elements.length < index) {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                TrackMemory.deleteUser(chatId);
                bot.sendMessage(chatId, "Oops, the page appears to have changed as we are talking. "
                        + "Please start over again.");
                return;
            }

            await page.evaluate((element: ElementHandle<NodeFor<string>>) => {
                element.scrollIntoView();
            }, elements[index]);
            await page.evaluate('window.scrollBy(0, -150)');
            const filename = getRandomString();
            await page.screenshot({
                path: './media/' + filename + '.jpg',
            });

            setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_SELECTOR_CONFIRM), 100);
            bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                caption: "Is this the section you want to track?",
            }).then(() => {
                unlink('media/' + filename + '.jpg', () => {});
            });
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
                bot.sendMessage(chatId, "Alright, can you give me the correct query selector, or the correct number of pixels to scroll down?");
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

const trackDailyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_DAILY
                && query.message!.text === dailyPoll.question) {
            const messageId = query.message!.message_id;
            const selectedOption = Number(query.data);
            TrackMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${numberToTime(selectedOption)}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            const { id, link, selector, index, caption } = await TrackMemory.build(chatId);
            const isValid = () => Tracker.findOne({
                where: {
                    id: id,
                },
            }).then(tracker => tracker !== null);
            const job = async () => {
                const browser = await launch();
                const page = await browser.newPage();
                page.setViewport({
                    width: 1440,
                    height: 715,
                });
                
                try {
                    await page.goto(link);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like the page at ${link} has been removed.`);
                    return;
                }

                const tryNumber = Number(selector);
                if (!isNaN(tryNumber)) {
                    await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                } else {
                    const elements = await page.$$(selector);
                    if (elements.length >= 1) {
                        const element = index && index < elements.length ? elements[index] : elements[0];
                        await page.evaluate((element: ElementHandle<NodeFor<string>>) => {
                            element.scrollIntoView();
                        }, element);
                        await page.evaluate('window.scrollBy(0, -150)');
                    }
                }

                const filename = getRandomString();
                await page.screenshot({
                    path: './media' + filename + '.jpg',
                });
                bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                    caption: caption,
                }).then(() => {
                    unlink('media/' + filename + '.jpg', () => {});
                });
                return;
            };
            setReminder({
                number: selectedOption,
                frequency: 'daily',
                job: job,
                isValid: isValid,
            });
            
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have set a website tracker for ${TrackMemory.getTracker(chatId)}`, {
                parse_mode: "Markdown",
            });
        }
    },
};

const trackWeeklyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_WEEKLY
                && query.message!.text === weeklyPoll.question) {
            const messageId = query.message!.message_id;
            const selectedOption = Number(query.data);
            TrackMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${weeklyNumberToString(selectedOption)}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            const { id, link, selector, index, caption } = await TrackMemory.build(chatId);
            const isValid = () => Tracker.findOne({
                where: {
                    id: id,
                },
            }).then(tracker => tracker !== null);
            const job = async () => {
                const browser = await launch();
                const page = await browser.newPage();
                page.setViewport({
                    width: 1440,
                    height: 715,
                });
                
                try {
                    await page.goto(link);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like the page at ${link} has been removed.`);
                    return;
                }

                const tryNumber = Number(selector);
                if (!isNaN(tryNumber)) {
                    await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                } else {
                    const elements = await page.$$(selector);
                    if (elements.length >= 1) {
                        const element = index && index < elements.length ? elements[index] : elements[0];
                        await page.evaluate((element: ElementHandle<NodeFor<string>>) => {
                            element.scrollIntoView();
                        }, element);
                        await page.evaluate('window.scrollBy(0, -150)');
                    }
                }

                const filename = getRandomString();
                await page.screenshot({
                    path: './media' + filename + '.jpg',
                });
                bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                    caption: caption,
                }).then(() => {
                    unlink('media/' + filename + '.jpg', () => {});
                });
                return;
            };
            setReminder({
                number: selectedOption,
                frequency: 'weekly',
                job: job,
                isValid: isValid,
            });

            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have set a website tracker for ${TrackMemory.getTracker(chatId)}`, {
                parse_mode: "Markdown",
            });
        }
    },
};

const trackOnceHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_ONCE) {
            const date: Date | undefined = parseDateTime(msg.text!);
            if (!date || isNaN(date.getTime())) {
                bot.sendMessage(chatId, "Oops, I do not understand your datetime.");
                return;
            }
            if (date < new Date()) {
                bot.sendMessage(chatId, "Oops, you cannot set website tracker for something in the past.");
                return;
            }
            if (date > new Date(2030, 11, 31)) {
                bot.sendMessage(chatId, "Oops, you cannot set website tracker for some time beyond the year of 2030.");
                return;
            }
            TrackMemory.setTime(chatId, date.getTime() / 1000);

            const { id, link, selector, index, caption } = await TrackMemory.build(chatId);
            const isValid = () => Tracker.findOne({
                where: {
                    id: id,
                },
            }).then(tracker => tracker !== null);
            const job = async () => {
                const browser = await launch();
                const page = await browser.newPage();
                page.setViewport({
                    width: 1440,
                    height: 715,
                });
                
                try {
                    await page.goto(link);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like the page at ${link} has been removed.`);
                    return;
                }

                const tryNumber = Number(selector);
                if (!isNaN(tryNumber)) {
                    await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                } else {
                    const elements = await page.$$(selector);
                    if (elements.length >= 1) {
                        const element = index && index < elements.length ? elements[index] : elements[0];
                        await page.evaluate((element: ElementHandle<NodeFor<string>>) => {
                            element.scrollIntoView();
                        }, element);
                        await page.evaluate('window.scrollBy(0, -150)');
                    }
                }

                const filename = getRandomString();
                await page.screenshot({
                    path: './media/' + filename + '.jpg',
                });
                bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                    caption: caption,
                }).then(() => {
                    unlink('media/' + filename + '.jpg', () => {});
                });
                return;
            };
            setReminder({
                number: date.getTime()/ 1000,
                frequency: 'once',
                job: job,
                isValid: isValid,
            });

            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have set a website tracker for ${TrackMemory.getTracker(chatId)}`, {
                parse_mode: "Markdown",
            });
        }
    },
};

export const trackTextHandlers: Array<TextHandler> = [
    trackHandler,
    trackAddHandler,
    querySelectorInfoHandler,
];

export const trackPlainHandler: Array<PlainHandler> = [
    trackAddressHandler,
    trackConfirmHandler,
    trackSelectorHandler,
    trackSelectorIndexHandler,
    trackSelectorConfirmHandler,
    trackCaptionHandler,
    trackOnceHandler,
];

export const trackPollHandler: Array<PollAnswerHandler> = [
    trackFrequencyHandler,
    trackDailyHandler,
    trackWeeklyHandler,
];
