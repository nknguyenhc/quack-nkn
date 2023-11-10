import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { PlainHandler, PollAnswerHandler, TextHandler } from '../utils/types';
import UserStates from '../utils/states';
import { numberToTime, weeklyNumberToString } from '../utils/primitives';
import { confirmErrorMessage, frequencyPoll } from './data';
import { TrackDeleteMemory, TrackEditMemory, TrackMemory } from './temp';
import { buildVisitJob, checkDateString, frequencyHandler, listingAllTrackers, setEditedVisitJob, setVisitJob, trackerDataToString, visitLinkAndScreenshot, visitLinkAndScrollToSelector, visitLinkAndScrollToSelectorIndex } from './functions';

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
            if (await listingAllTrackers({
                bot: bot,
                chatId: chatId,
            })) {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            }
        }
    },
};

const listTrackHandler: TextHandler = {
    command: /^\/track$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.LIST) {
            if (await listingAllTrackers({
                bot: bot,
                chatId: chatId,
            })) {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            }
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
            visitLinkAndScreenshot({
                link: link,
                bot: bot,
                chatId: chatId,
                invalidHandler: () => bot.sendMessage(chatId, "Oops, the URL you sent me seems to be invalid, please send me the correct link."),
                caption: "Is this the site that you want to track?",
                turnNextState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_CONFIRM),
            });
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
            visitLinkAndScrollToSelector({
                link: link,
                bot: bot,
                chatId: chatId,
                invalidHandler: () => {
                    bot.sendMessage(chatId, "Oops, looks like the page has just been removed. "
                        + "Please try adding another tracker.");
                    TrackMemory.deleteUser(chatId);
                    UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                },
                selector: selector,
                caption: "Is this the section you want to track?",
                setPixelCount: TrackMemory.setPixelCount,
                setSelector: TrackMemory.setSelector,
                setSelectorCount: TrackMemory.setSelectorCount,
                toConfirmState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_SELECTOR_CONFIRM),
                toIndexState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_INDEX),
            });
        }
    },
};

const trackSelectorIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_INDEX) {
            visitLinkAndScrollToSelectorIndex({
                indexString: msg.text!,
                bot: bot,
                chatId: chatId,
                invalidHandler: () => {
                    bot.sendMessage(chatId, "Oops, looks like the page has just been removed. Please try adding another tracker.");
                    TrackMemory.deleteUser(chatId);
                    UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                },
                caption: "Is this the section you want to track?",
                getSelectorCount: TrackMemory.getSelectorCount,
                deleteUser: TrackMemory.deleteUser,
                setIndex: TrackMemory.setIndex,
                getSelector: TrackMemory.getSelector,
                getLink: TrackMemory.getLink,
                toConfirmState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_SELECTOR_CONFIRM),
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
            setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_FREQUENCY));
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
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_FREQUENCY) {
            frequencyHandler({
                bot: bot,
                chatId: chatId,
                query: query,
                toDailyState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_DAILY),
                toWeeklyState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_WEEKLY),
                toOnceState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_ONCE),
                setFrequency: TrackMemory.setFrequency,
            });
        }
    },
};

const trackDailyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_DAILY) {
            await setVisitJob({
                query: query,
                bot: bot,
                chatId: chatId,
                frequency: 'daily',
                text: selectedOption => `You selected: ${numberToTime(selectedOption)}`,
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const trackWeeklyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_WEEKLY) {
            await setVisitJob({
                query: query,
                bot: bot,
                chatId: chatId,
                frequency: 'weekly',
                text: selectedOption => `You selected: ${weeklyNumberToString(selectedOption)}`,
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const trackOnceHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_ONCE) {
            const date = checkDateString({
                string: msg.text!,
                bot: bot,
                chatId: chatId,
            });
            if (!date) {
                return;
            }
            TrackMemory.setTime(chatId, date.getTime() / 1000);
            const { id, link, selector, index, caption } = await TrackMemory.build(chatId);
            await buildVisitJob({
                bot: bot,
                chatId: chatId,
                id: id,
                link: link,
                selector: selector,
                index: index,
                caption: caption,
                number: date.getTime()/ 1000,
                frequency: 'once',
                feedback: () => `Alright, I have set a website tracker for ${TrackMemory.getTracker(chatId)}`,
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const trackEditHandler: TextHandler = {
    command: /^\/edit$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_START) {
            const isNonEmptyList = await listingAllTrackers({
                bot: bot,
                chatId: chatId,
                tempSetter: (allTrackers) => TrackEditMemory.setUser(chatId, allTrackers.map(tracker => ({
                    id: tracker.dataValues.id,
                    link: tracker.dataValues.address,
                }))),
                lastNote: "Which website tracker do you want to edit? Key in the index of the tracker.",
            });
            if (isNonEmptyList) {
                UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT);
            }
        }
    },
};

const editTrackHandler: TextHandler = {
    command: /^\/track$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.EDIT) {
            const isNonEmptyList = await listingAllTrackers({
                bot: bot,
                chatId: chatId,
                tempSetter: (allTrackers) => TrackEditMemory.setUser(chatId, allTrackers.map(tracker => ({
                    id: tracker.dataValues.id,
                    link: tracker.dataValues.address,
                }))),
                lastNote: "Which website tracker do you want to edit? Key in the index of the tracker.",
            });
            if (isNonEmptyList) {
                UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT);
            }
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
            visitLinkAndScreenshot({
                link: link,
                bot: bot,
                chatId: chatId,
                invalidHandler: () => bot.sendMessage(chatId, "Oops, the URL you sent me seems to be invalid, plese send me the correct link."),
                caption: "Is this the new site that you want to track?",
                turnNextState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_LINK_CONFIRM),
            });
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
                await buildVisitJob({
                    bot: bot,
                    chatId: chatId,
                    id: id,
                    link: address,
                    selector: selector,
                    index: selectorIndex,
                    caption: caption,
                    number: time,
                    frequency: frequency,
                    feedback: () => `Your tracker has been updated successfully to ${trackerDataToString(tracker)}.`,
                });
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.NORMAL), 100);
                return;
            }

            bot.sendMessage(chatId, "Alright, give me a second.");
            const link = TrackEditMemory.getLink(chatId);
            visitLinkAndScrollToSelector({
                link: link,
                bot: bot,
                chatId: chatId,
                invalidHandler: () => {
                    TrackEditMemory.deleteUser(chatId);
                    UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                    bot.sendMessage(chatId, "Oops, looks like the page has just been removed. Operation cancelled.");
                },
                selector: selector,
                caption: "Is this the section you want to track?",
                setPixelCount: TrackEditMemory.setPixelCount,
                setSelector: TrackEditMemory.setSelector,
                setSelectorCount: TrackEditMemory.setSelectorCount,
                toConfirmState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_SELECTOR_CONFIRM),
                toIndexState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_INDEX),
            });
        }
    },
};

const trackEditSelectorIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_INDEX) {
            visitLinkAndScrollToSelectorIndex({
                indexString: msg.text!,
                bot: bot,
                chatId: chatId,
                invalidHandler: () => {
                    UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                    TrackEditMemory.deleteUser(chatId);
                    bot.sendMessage(chatId, "Oops, looks like the page has just been removed. Operation cancelled.");
                },
                caption: "Is this the section you want to track?",
                getSelectorCount: TrackEditMemory.getSelectorCount,
                deleteUser: TrackEditMemory.deleteUser,
                setIndex: TrackEditMemory.setIndex,
                getSelector: TrackEditMemory.getSelector,
                getLink: TrackEditMemory.getLink,
                toConfirmState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_SELECTOR_CONFIRM),
            });
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
                await buildVisitJob({
                    bot: bot,
                    chatId: chatId,
                    id: id,
                    link: address,
                    selector: selector,
                    index: selectorIndex,
                    caption: caption,
                    number: time,
                    frequency: frequency,
                    feedback: () => `Your tracker has been updated successfully to ${trackerDataToString(tracker)}.`,
                });
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.NORMAL), 100);
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
            await buildVisitJob({
                bot: bot,
                chatId: chatId,
                id: id,
                link: address,
                selector: selector,
                index: selectorIndex,
                caption: caption,
                number: time,
                frequency: frequency,
                feedback: () => `Your tracker has been updated successfully to ${trackerDataToString(tracker)}.`,
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const trackEditFrequencyCommandHandler: TextHandler = {
    command: /^\/frequency$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_TYPE) {
            setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_FREQUENCY), 100);
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
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_FREQUENCY) {
            frequencyHandler({
                bot: bot,
                chatId: chatId,
                query: query,
                toDailyState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_DAILY),
                toWeeklyState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_WEEKLY),
                toOnceState: () => UserStates.setUserState(chatId, UserStates.STATE.TRACK_EDIT_ONCE),
                setFrequency: TrackEditMemory.setFrequency,
            });
        }
    },
};

const trackEditDailyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_DAILY) {
            await setEditedVisitJob({
                query: query,
                bot: bot,
                chatId: chatId,
                text: (selectedOption) => `You selected: ${numberToTime(selectedOption)}`,
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const trackEditWeeklyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_WEEKLY) {
            await setEditedVisitJob({
                query: query,
                bot: bot,
                chatId: chatId,
                text: (selectedOption) => `You selected: ${weeklyNumberToString(selectedOption)}`,
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const trackEditOnceHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_EDIT_ONCE) {
            const date = checkDateString({
                string: msg.text!,
                bot: bot,
                chatId: chatId,
            });
            if (!date) {
                return;
            }
            TrackEditMemory.setTime(chatId, date.getTime() / 1000);
            const tracker = await TrackEditMemory.build(chatId);
            const { id, address, selector, selectorIndex, caption, frequency, time } = tracker.dataValues;
            await buildVisitJob({
                bot: bot,
                chatId: chatId,
                id: id,
                link: address,
                selector: selector,
                index: selectorIndex,
                caption: caption,
                number: time,
                frequency: frequency,
                feedback: () => `Your tracker has been updated successfully to ${trackerDataToString(tracker)}.`,
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const trackDeleteHandler: TextHandler = {
    command: /^\/delete$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TRACK_START) {
            const isNonEmptyList = await listingAllTrackers({
                bot: bot,
                chatId: chatId,
                tempSetter: allTrackers => TrackDeleteMemory.setUser(chatId, allTrackers.map(tracker => ({
                    id: tracker.dataValues.id,
                    link: tracker.dataValues.address,
                }))),
                lastNote: "Which tracker do you want to delete? Key in the index of the tracker.",
            });
            if (isNonEmptyList) {
                UserStates.setUserState(chatId, UserStates.STATE.TRACK_DELETE);
            }
        }
    },
};

const deleteTrackHandler: TextHandler = {
    command: /^\/track$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.DELETE) {
            const isNonEmptyList = await listingAllTrackers({
                bot: bot,
                chatId: chatId,
                tempSetter: allTrackers => TrackDeleteMemory.setUser(chatId, allTrackers.map(tracker => ({
                    id: tracker.dataValues.id,
                    link: tracker.dataValues.address,
                }))),
                lastNote: "Which tracker do you want to delete? Key in the index of the tracker.",
            });
            if (isNonEmptyList) {
                UserStates.setUserState(chatId, UserStates.STATE.TRACK_DELETE);
            }
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
