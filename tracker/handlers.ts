import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { PlainHandler, PollAnswerHandler, TextHandler } from '../utils/types';
import UserStates from '../utils/states';
import { ElementHandle, NodeFor } from 'puppeteer';
import { getRandomString, numberToTime, numberToTimeString, parseDateTime, weeklyNumberToString } from '../utils/primitives';
import { unlink } from 'fs';
import { confirmErrorMessage, dailyPoll, frequencyPoll, onceQuestion, weeklyPoll } from './data';
import { TrackDeleteMemory, TrackEditMemory, TrackMemory } from './temp';
import { FrequencyType, setReminder } from '../utils/schedule';
import { Tracker, TrackerType } from './db';
import { Model } from 'sequelize';
import { launchBrowserAndPage } from './functions';

const trackerDataToString = (tracker: Model<TrackerType, TrackerType>): string => {
    return `\`${
        tracker.dataValues.address
    }\` (${
        tracker.dataValues.frequency
    }) ${
        numberToTimeString(tracker.dataValues.time, tracker.dataValues.frequency)
    } (selector: ${
        tracker.dataValues.selector
    }, caption: ${
        tracker.dataValues.caption
    })`;
};

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

const addTrackHandler: TextHandler = {
    command: /^\/track$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.ADD) {
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_ADD);
            bot.sendMessage(chatId, "Alright, give me the address of the website that you wish to track.\n"
                + "In your message, send the address of the website only. Do not add any extra text.\n"
                + "Please take note that I can only track websites that are publicly available and is not blocked by Chrome "
                + "(i.e. does not require logging in, no malicious content, no onion website)");
        }
    },
};

const trackListHandler: TextHandler = {
    command: /^\/list$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_START) {
            const allTrackers = await Tracker.findAll({
                where: {
                    userChatId: String(chatId),
                },
            });
            if (allTrackers.length === 0) {
                bot.sendMessage(chatId, "You have no website trackers yet.");
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            let message = 'Alright, here is your list of website trackers:';
            allTrackers.forEach((tracker, trackerIndex) => {
                message += `\n${trackerIndex + 1}. ${trackerDataToString(tracker)}`;
            });
            bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const listTrackHandler: TextHandler = {
    command: /^\/track$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.LIST) {
            const allTrackers = await Tracker.findAll({
                where: {
                    userChatId: String(chatId),
                },
            });
            if (allTrackers.length === 0) {
                bot.sendMessage(chatId, "You have no website trackers yet.");
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            let message = 'Alright, here is your list of website trackers:';
            allTrackers.forEach((tracker, trackerIndex) => {
                message += `\n${trackerIndex + 1}. ${trackerDataToString(tracker)}`;
            });
            bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
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

            const { browser, page } = await launchBrowserAndPage();

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
                        + "For your reference, 750 pixels are around the height of your browser on computer.\n"
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
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_SELECTOR
                || UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_SELECTOR) {
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

            if (selector === 'top') {
                TrackMemory.setPixelCount(chatId, 0);
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_CAPTION), 100);
                bot.sendMessage(chatId, "Ok, I will track the website at the top.\n"
                        + "What caption do you wish to put for your tracker?");
                return;
            }
            
            bot.sendMessage(chatId, "Alright, give me a second.");
            const link = TrackMemory.getLink(chatId);
            const { browser, page } = await launchBrowserAndPage();
            
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
                browser.close();
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

            browser.close();
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
            const { browser, page } = await launchBrowserAndPage();
            
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
                browser.close();
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
            browser.close();

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
                const { browser, page } = await launchBrowserAndPage();
                
                try {
                    await page.goto(link);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like the page at ${link} has been removed.`);
                    browser.close();
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
                browser.close();
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
                const { browser, page } = await launchBrowserAndPage();
                
                try {
                    await page.goto(link);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like the page at ${link} has been removed.`);
                    browser.close();
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
                browser.close();
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
                bot.sendMessage(chatId, "Oops, you cannot set website tracker for some time in the past.");
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
                const { browser, page } = await launchBrowserAndPage();
                
                try {
                    await page.goto(link);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like the page at ${link} has been removed.`);
                    browser.close();
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
                browser.close();
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

const trackEditHandler: TextHandler = {
    command: /^\/edit$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_START) {
            const allTrackers = await Tracker.findAll({
                where: {
                    userChatId: String(chatId),
                },
            });
            if (allTrackers.length === 0) {
                bot.sendMessage(chatId, "You have no website trackers to edit yet.");
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            TrackEditMemory.setUser(chatId, allTrackers.map(tracker => ({
                id: tracker.dataValues.id,
                link: tracker.dataValues.address,
            })));
            let message = 'Here is your list of website trackers:';
            allTrackers.forEach((tracker, trackerIndex) => {
                message += `\n${trackerIndex + 1}. ${trackerDataToString(tracker)}`;
            });
            message += '\nWhich website tracker do you want to edit? Key in the index of the tracker.';
            bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
            });
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT);
        }
    },
};

const editTrackHandler: TextHandler = {
    command: /^\/track$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.EDIT) {
            const allTrackers = await Tracker.findAll({
                where: {
                    userChatId: String(chatId),
                },
            });
            if (allTrackers.length === 0) {
                bot.sendMessage(chatId, "You have no website trackers to edit yet.");
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            TrackEditMemory.setUser(chatId, allTrackers.map(tracker => ({
                id: tracker.dataValues.id,
                link: tracker.dataValues.address,
            })));
            let message = 'Here is your list of website trackers:';
            allTrackers.forEach((tracker, trackerIndex) => {
                message += `\n${trackerIndex + 1}. ${trackerDataToString(tracker)}`;
            });
            message += '\nWhich website tracker do you want to edit? Key in the index of the tracker.';
            bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
            });
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT);
        }
    },
};

const trackEditTrackerIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT) {
            const trackerIndex = Number(msg.text);
            const edited = TrackEditMemory.setTrackerIndex(chatId, trackerIndex);
            if (!edited) {
                bot.sendMessage(chatId, 'Oops, invalid index!');
                return;
            }

            UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_TYPE);
            bot.sendMessage(chatId, 'What do you wish to edit?\n'
                + '/link - change the link of the tracker\n'
                + '/selector - change the section of the webpage to track\n'
                + '/caption - change the caption of the tracker\n'
                + '/frequency - change the frequency or timing of the tracker\n');
        }
    },
};

const trackEditLinkCommandHandler: TextHandler = {
    command: /^\/link$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_TYPE) {
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_LINK);
            bot.sendMessage(chatId, "Alright, give me the address of the website that you wish to track.\n"
                + "In your message, send the address of the website only. Do not add any extra text.\n");
        }
    },
};

const trackEditLinkHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_LINK) {
            const link = msg.text!;
            bot.sendMessage(chatId, 'Alright, give me a second.');
            TrackEditMemory.setLink(chatId, link);

            const { browser, page } = await launchBrowserAndPage();

            try {
                await page.goto(link);
            } catch (e) {
                bot.sendMessage(chatId, "Oops, the URL you sent me seems to be invalid, plese send me the correct link.");
                return;
            }

            const filename = getRandomString();
            await page.screenshot({
                path: './media/' + filename + '.jpg',
            });
            browser.close();

            bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                caption: "Is this the new site that you want to track?",
            }).then(() => {
                unlink('media/' + filename + '.jpg', () => {});
            });
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_LINK_CONFIRM);
        }
    },
};

const trackEditLinkConfirmHandler: PlainHandler = {
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_LINK_CONFIRM) {
            const reply = msg.text!.toLowerCase().trim();
            if (reply === 'yes' || reply === 'y') {
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_SELECTOR), 100);
                bot.sendMessage(chatId, "Alright, do you wish to scroll down to a particular section?\n"
                    + "If you do not need me to scroll down, simply type \"top\"\n"
                    + "If you wish me to scroll down, give me the number of pixels that I need to scroll down. "
                    + "For your reference, 750 pixels are around the height of your browser on computer.\n"
                    + "For advanced user, you may use query selector. /selector for more info.");
            } else if (reply === 'no' || reply === 'n') {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                TrackEditMemory.deleteUser(chatId);
                bot.sendMessage(chatId, "Cancelled editing the website tracker. "
                    + "If you believe the above was a bug, please contact my boss at nknguyenhc@gmail.com");
            } else {
                bot.sendMessage(chatId, confirmErrorMessage);
            }
        }
    },
};

const trackEditSelectorCommandHandler: TextHandler = {
    command: /^\/selector$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_TYPE) {
            setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_SELECTOR), 100);
            bot.sendMessage(chatId, "Alright, what is the new selector for your tracker?\n"
                + "If you do not need me to scroll down, simply type \"top\"\n"
                + "If you wish me to scroll down, give me the number of pixels that I need to scroll down. "
                + "For your reference, 750 pixels are around the height of your browser on computer.\n"
                + "For advanced user, you may use query selector. /selector for more info.");
        }
    },
}

const trackEditSelectorHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_SELECTOR) {
            const selector = msg.text!;

            if (selector === 'top') {
                TrackEditMemory.setPixelCount(chatId, 0);
                const tracker = await TrackEditMemory.build(chatId);
                const { id, address, selector, selectorIndex, caption, frequency, time } = tracker.dataValues;
                const isValid = () => Tracker.findOne({
                    where: {
                        id: id,
                    },
                }).then(tracker => tracker !== null);
                const job = async () => {
                    const { browser, page } = await launchBrowserAndPage();

                    try {
                        await page.goto(address);
                    } catch (e) {
                        bot.sendMessage(chatId, `Oops, looks like that page at ${address} has been removed.`);
                        browser.close();
                        return;
                    }

                    const tryNumber = Number(selector);
                    if (!isNaN(tryNumber)) {
                        await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                    } else {
                        const elements = await page.$$(selector);
                        if (elements.length >= 1) {
                            const element = selectorIndex && selectorIndex < elements.length ? elements[selectorIndex] : elements[0];
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
                    browser.close();
                };
                setReminder({
                    number: time,
                    frequency: frequency,
                    job: job,
                    isValid: isValid,
                });

                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.NORMAL), 100);
                bot.sendMessage(chatId, "Ok, I will track the website at the top.\n"
                    + `Your tracker has been updated successfully to ${trackerDataToString(tracker)}.`, {
                        parse_mode: "Markdown",
                    });
                return;
            }

            bot.sendMessage(chatId, "Alright, give me a second.");
            const link = TrackEditMemory.getLink(chatId);
            const { browser, page } = await launchBrowserAndPage();

            try {
                await page.goto(link);
            } catch (e) {
                TrackEditMemory.deleteUser(chatId);
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                bot.sendMessage(chatId, "Oops, looks like the page has just been removed. "
                    + "Operation cancelled.");
                browser.close();
                return;
            }

            const tryNumber = Number(selector);
            if (!isNaN(tryNumber)) {
                await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                const filename = getRandomString();
                await page.screenshot({
                    path: './media/' + filename + '.jpg',
                });
                TrackEditMemory.setPixelCount(chatId, tryNumber);
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_SELECTOR_CONFIRM), 100);
                bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                    caption: "Is this the section you want to track?",
                }).then(() => {
                    unlink('media/' + filename + '.jpg', () => {});
                });
                browser.close();
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
                TrackEditMemory.setSelector(chatId, selector);
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_SELECTOR_CONFIRM), 100);
                bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                    caption: "Is this the section you want to track?",
                }).then(() => {
                    unlink('media/' + filename + '.jpg', () => {});
                });
            } else if (elements.length > 1) {
                TrackEditMemory.setSelector(chatId, selector);
                TrackEditMemory.setSelectorCount(chatId, elements.length);
                UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_INDEX);
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

            browser.close();
        }
    },
};

const trackEditSelectorIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_INDEX) {
            const index = Number(msg.text);
            const range = TrackEditMemory.getSelectorCount(chatId);
            if (isNaN(index) || index >= range || index < 0) {
                bot.sendMessage(chatId, `Invalid index, index should be between 0 and ${index - 1} inclusive.`);
                return;
            }

            bot.sendMessage(chatId, "Alright, give me a second.");
            TrackEditMemory.setIndex(chatId, index);
            const selector = TrackEditMemory.getSelector(chatId);
            const link = TrackEditMemory.getLink(chatId);
            const { browser, page } = await launchBrowserAndPage();

            try {
                await page.goto(link);
            } catch (e) {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                TrackEditMemory.deleteUser(chatId);
                bot.sendMessage(chatId, "Oops, looks like the page has just been removed. "
                    + "Operation cancelled.");
                browser.close();
                return;
            }

            const elements = await page.$$(selector);

            if (elements.length < index) {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                TrackMemory.deleteUser(chatId);
                bot.sendMessage(chatId, "Oops, the page appears to have changed as we are talking. "
                    + "Operation cancelled.");
                browser.close();
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

            setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_SELECTOR_CONFIRM), 100);
            bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
                caption: "Is this the section you want to track?",
            }).then(() => {
                unlink('media/' + filename + '.jpg', () => {});
            });
            browser.close();
        }
    },
};

const trackEditSelectorConfirmHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_SELECTOR_CONFIRM) {
            const reply = msg.text!.toLowerCase().trim();
            if (reply === 'yes' || reply === 'y') {
                const tracker = await TrackEditMemory.build(chatId);
                const { id, address, selector, selectorIndex, caption, frequency, time } = tracker.dataValues;
                const isValid = () => Tracker.findOne({
                    where: {
                        id: id,
                    },
                }).then(tracker => tracker !== null);
                const job = async () => {
                    const { browser, page } = await launchBrowserAndPage();

                    try {
                        await page.goto(address);
                    } catch (e) {
                        bot.sendMessage(chatId, `Oops, looks like that page at ${address} has been removed.`);
                        browser.close();
                        return;
                    }

                    const tryNumber = Number(selector);
                    if (!isNaN(tryNumber)) {
                        await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                    } else {
                        const elements = await page.$$(selector);
                        if (elements.length >= 1) {
                            const element = selectorIndex && selectorIndex < elements.length ? elements[selectorIndex] : elements[0];
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
                    browser.close();
                };
                setReminder({
                    number: time,
                    frequency: frequency,
                    job: job,
                    isValid: isValid,
                });

                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.NORMAL), 100);
                bot.sendMessage(chatId, `Your tracker has been updated successfully to ${trackerDataToString(tracker)}.`, {
                    parse_mode: "Markdown",
                });
            } else if (reply === 'no' || reply === 'n') {
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_SELECTOR), 100);
                bot.sendMessage(chatId, "Alright, can you give me the correct query selector, or the correct number of pixels to scroll down?");
            } else {
                bot.sendMessage(chatId, confirmErrorMessage);
            }
        }
    },
};

const trackEditCaptionCommandHandler: TextHandler = {
    command: /^\/caption$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_TYPE) {
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_CAPTION);
            bot.sendMessage(chatId, "What is the new caption you want to put for your tracker?");
        }
    },
};

const trackEditCaptionHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_CAPTION) {
            TrackEditMemory.setCaption(chatId, msg.text!);

            const tracker = await TrackEditMemory.build(chatId);
            const { id, address, selector, selectorIndex, caption, frequency, time } = tracker.dataValues;
            const isValid = () => Tracker.findOne({
                where: {
                    id: id,
                },
            }).then(tracker => tracker !== null);
            const job = async () => {
                const { browser, page } = await launchBrowserAndPage();

                try {
                    await page.goto(address);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like that page at ${address} has been removed.`);
                    browser.close();
                    return;
                }

                const tryNumber = Number(selector);
                if (!isNaN(tryNumber)) {
                    await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                } else {
                    const elements = await page.$$(selector);
                    if (elements.length >= 1) {
                        const element = selectorIndex && selectorIndex < elements.length ? elements[selectorIndex] : elements[0];
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
                browser.close();
            };
            setReminder({
                number: time,
                frequency: frequency,
                job: job,
                isValid: isValid,
            });

            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Your tracker has been updated successfully to ${trackerDataToString(tracker)}.`, {
                parse_mode: "Markdown",
            });
        }
    },
};

const trackEditFrequencyCommandHandler: TextHandler = {
    command: /^\/frequency$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_TYPE) {
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_FREQUENCY);
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

const trackEditFrequencyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_FREQUENCY
                && query.message!.text === frequencyPoll.question) {
            const messageId = query.message!.message_id;
            const selectedOption: FrequencyType = query.data as FrequencyType;
            TrackEditMemory.setFrequency(chatId, selectedOption);

            bot.editMessageText(
                `Alright, I will send you screenshots ${selectedOption}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            switch (selectedOption) {
                case 'daily':
                    UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_DAILY);
                    bot.sendMessage(chatId, dailyPoll.question, {
                        reply_markup: {
                            inline_keyboard: dailyPoll.options,
                        },
                    }).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
                case 'weekly':
                    UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_WEEKLY);
                    bot.sendMessage(chatId, weeklyPoll.question, {
                        reply_markup: {
                            inline_keyboard: weeklyPoll.options,
                        },
                    }).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
                case 'once':
                    UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_ONCE);
                    bot.sendMessage(chatId, onceQuestion).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
            }
        }
    },
};

const trackEditDailyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_DAILY
                && query.message!.text === dailyPoll.question) {
            const messageId = query.message!.message_id;
            const selectedOption = Number(query.data);
            TrackEditMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${numberToTime(selectedOption)}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            const tracker = await TrackEditMemory.build(chatId);
            const { id, address, selector, selectorIndex, caption, frequency, time } = tracker.dataValues;
            const isValid = () => Tracker.findOne({
                where: {
                    id: id,
                },
            }).then(tracker => tracker !== null);
            const job = async () => {
                const { browser, page } = await launchBrowserAndPage();

                try {
                    await page.goto(address);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like that page at ${address} has been removed.`);
                    browser.close();
                    return;
                }

                const tryNumber = Number(selector);
                if (!isNaN(tryNumber)) {
                    await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                } else {
                    const elements = await page.$$(selector);
                    if (elements.length >= 1) {
                        const element = selectorIndex && selectorIndex < elements.length ? elements[selectorIndex] : elements[0];
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
                browser.close();
            };
            setReminder({
                number: time,
                frequency: frequency,
                job: job,
                isValid: isValid,
            });

            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Your tracker has been updated successfully to ${trackerDataToString(tracker)}.`, {
                parse_mode: "Markdown",
            });
        }
    },
};

const trackEditWeeklyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_WEEKLY
                && query.message!.text === weeklyPoll.question) {
            const messageId = query.message!.message_id;
            const selectedOption = Number(query.data);
            TrackEditMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${weeklyNumberToString(selectedOption)}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            const tracker = await TrackEditMemory.build(chatId);
            const { id, address, selector, selectorIndex, caption, frequency, time } = tracker.dataValues;
            const isValid = () => Tracker.findOne({
                where: {
                    id: id,
                },
            }).then(tracker => tracker !== null);
            const job = async () => {
                const { browser, page } = await launchBrowserAndPage();

                try {
                    await page.goto(address);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like that page at ${address} has been removed.`);
                    browser.close();
                    return;
                }

                const tryNumber = Number(selector);
                if (!isNaN(tryNumber)) {
                    await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                } else {
                    const elements = await page.$$(selector);
                    if (elements.length >= 1) {
                        const element = selectorIndex && selectorIndex < elements.length ? elements[selectorIndex] : elements[0];
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
                browser.close();
            };
            setReminder({
                number: time,
                frequency: frequency,
                job: job,
                isValid: isValid,
            });

            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Your tracker has been updated successfully to ${trackerDataToString(tracker)}.`, {
                parse_mode: "Markdown",
            });
        }
    },
};

const trackEditOnceHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_ONCE) {
            const date: Date | undefined = parseDateTime(msg.text!);
            if (!date || isNaN(date.getTime())) {
                bot.sendMessage(chatId, "Oops, I do not understand your datetime.");
                return;
            }
            if (date < new Date()) {
                bot.sendMessage(chatId, "Oops, you cannot set website tracker for some time in the past.");
                return;
            }
            if (date > new Date(2030, 11, 31)) {
                bot.sendMessage(chatId, "Oops, you cannot set website tracker for some time beyond the year of 2030.");
                return;
            }
            TrackEditMemory.setTime(chatId, date.getTime() / 1000);

            const tracker = await TrackEditMemory.build(chatId);
            const { id, address, selector, selectorIndex, caption, frequency, time } = tracker.dataValues;
            const isValid = () => Tracker.findOne({
                where: {
                    id: id,
                },
            }).then(tracker => tracker !== null);
            const job = async () => {
                const { browser, page } = await launchBrowserAndPage();

                try {
                    await page.goto(address);
                } catch (e) {
                    bot.sendMessage(chatId, `Oops, looks like that page at ${address} has been removed.`);
                    browser.close();
                    return;
                }

                const tryNumber = Number(selector);
                if (!isNaN(tryNumber)) {
                    await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                } else {
                    const elements = await page.$$(selector);
                    if (elements.length >= 1) {
                        const element = selectorIndex && selectorIndex < elements.length ? elements[selectorIndex] : elements[0];
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
                browser.close();
            };
            setReminder({
                number: time,
                frequency: frequency,
                job: job,
                isValid: isValid,
            });

            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Your tracker has been updated successfully to ${trackerDataToString(tracker)}`, {
                parse_mode: "Markdown",
            });
        }
    },
};

const trackDeleteHandler: TextHandler = {
    command: /^\/delete$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_START) {
            const trackers = (await Tracker.findAll({
                where: { userChatId: String(chatId) },
            }));
            TrackDeleteMemory.setUser(chatId, trackers.map(tracker => ({
                id: tracker.dataValues.id,
                link: tracker.dataValues.address,
            })));
            let message = 'Here is your list of trackers:';
            trackers.forEach((tracker, trackerIndex) => {
                message += `\n${trackerIndex + 1}. ${trackerDataToString(tracker)}`;
            });
            message += `\nWhich tracker do you want to delete? Key in the index of the tracker.`;
            bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
            });
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_DELETE);
        }
    },
};

const deleteTrackHandler: TextHandler = {
    command: /^\/track$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.DELETE) {
            const trackers = (await Tracker.findAll({
                where: { userChatId: String(chatId) },
            }));
            TrackDeleteMemory.setUser(chatId, trackers.map(tracker => ({
                id: tracker.dataValues.id,
                link: tracker.dataValues.address,
            })));
            let message = 'Here is your list of trackers:';
            trackers.forEach((tracker, trackerIndex) => {
                message += `\n${trackerIndex + 1}. ${trackerDataToString(tracker)}`;
            });
            message += `\nWhich tracker do you want to delete? Key in the index of the tracker.`;
            bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
            });
            UserStates.setUserState(chatId, UserStates.STATE.TRACK_DELETE);
        }
    },
};

const trackDeleteIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_DELETE) {
            const index = Number(msg.text);
            const isDeleted = TrackDeleteMemory.deleteTracker(chatId, index);
            if (await isDeleted) {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                bot.sendMessage(chatId, `Alright, reminder ${index} has been deleted.`);
            } else {
                bot.sendMessage(chatId, `Index must be an integer between 1 and ${TrackDeleteMemory.getTrackerCount(chatId)}.`);
            }
        }
    },
};

export const trackTextHandlers: Array<TextHandler> = [
    trackHandler,
    trackAddHandler,
    addTrackHandler,
    querySelectorInfoHandler,
    trackListHandler,
    listTrackHandler,
    trackEditHandler,
    editTrackHandler,
    trackEditLinkCommandHandler,
    trackEditSelectorCommandHandler,
    trackEditCaptionCommandHandler,
    trackEditFrequencyCommandHandler,
    trackDeleteHandler,
    deleteTrackHandler,
];

export const trackPlainHandler: Array<PlainHandler> = [
    trackAddressHandler,
    trackConfirmHandler,
    trackSelectorHandler,
    trackSelectorIndexHandler,
    trackSelectorConfirmHandler,
    trackCaptionHandler,
    trackOnceHandler,
    trackEditTrackerIndexHandler,
    trackEditLinkHandler,
    trackEditLinkConfirmHandler,
    trackEditSelectorHandler,
    trackEditSelectorIndexHandler,
    trackEditSelectorConfirmHandler,
    trackEditCaptionHandler,
    trackEditOnceHandler,
    trackDeleteIndexHandler,
];

export const trackPollHandler: Array<PollAnswerHandler> = [
    trackFrequencyHandler,
    trackDailyHandler,
    trackWeeklyHandler,
    trackEditFrequencyHandler,
    trackEditDailyHandler,
    trackEditWeeklyHandler,
];
