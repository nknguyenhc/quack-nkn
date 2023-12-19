import { ElementHandle, NodeFor, Page, launch } from "puppeteer";
import { Model } from "sequelize";
import { Tracker, TrackerType } from "./db";
import { getRandomString, numberToTimeString, parseDateTime } from "../utils/primitives";
import TelegramBot, { CallbackQuery } from "node-telegram-bot-api";
import UserStates from "../utils/states";
import { TrackEditMemory, TrackMemory } from "./temp";
import { FrequencyType, setReminder } from "../utils/schedule";
import { dailyPoll, onceQuestion, weeklyPoll } from "./data";
import { getTimezone } from "../users/db";
import { sendPhoto } from '../utils/bot';
import Logger from "../logging/logger";

export const launchBrowserAndPage = async () => {
    const browser = await launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    page.setViewport({
        width: 1440,
        height: 715,
    });
    return { browser, page };
}

export const trackerDataToString = (tracker: Model<TrackerType, TrackerType>, timezone: number): string => {
    return `\`${
        tracker.dataValues.address
    }\` (${
        tracker.dataValues.frequency
    }) ${
        numberToTimeString(tracker.dataValues.time, tracker.dataValues.frequency, timezone)
    } (selector: ${
        tracker.dataValues.selector
    }, caption: ${
        tracker.dataValues.caption
    })`;
};

export const listingAllTrackers = async ({
    bot,
    chatId,
    tempSetter,
    lastNote,
}: {
    bot: TelegramBot,
    chatId: number,
    tempSetter?: (allTrackers: Array<Model<TrackerType, TrackerType>>) => void,
    lastNote?: string,
}): Promise<boolean> => {
    const allTrackers = await Tracker.findAll({
        where: {
            userChatId: String(chatId),
        },
    });
    tempSetter && tempSetter(allTrackers);
    if (allTrackers.length === 0) {
        bot.sendMessage(chatId, "You have no website trackers yet.");
        UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        return false;
    }

    const timezone = await getTimezone(chatId);
    let message = 'Alright, here is your list of website trackers:';
    allTrackers.forEach((tracker, trackerIndex) => {
        message += `\n${trackerIndex + 1}. ${trackerDataToString(tracker, timezone)}`;
    });
    lastNote && (message += "\n" + lastNote);
    bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
    });
    return true;
};

export const visitLinkAndScreenshot = async ({
    link,
    bot,
    chatId,
    invalidHandler,
    caption,
    turnNextState,
}: {
    link: string,
    bot: TelegramBot,
    chatId: number,
    invalidHandler: () => void,
    caption: string,
    turnNextState: () => void,
}) => {
    const { browser, page } = await launchBrowserAndPage();
    if (!await checkPageValidity({
        page: page,
        link: link,
        invalidHandler: invalidHandler,
    })) {
        browser.close();
        return;
    }

    await screenshot({
        page: page,
        bot: bot,
        chatId: chatId,
        caption: caption,
    });
    browser.close();
    turnNextState();
};

export const checkPageValidity = async ({
    page,
    link,
    invalidHandler,
}: {
    page: Page,
    link: string,
    invalidHandler: () => void,
}): Promise<boolean> => {
    try {
        Logger.getInfoLogger().log(`Visiting link: ${link}`);
        await page.goto(link);
        return true;
    } catch (e) {
        invalidHandler();
        return false;
    }
};

export const screenshot = async ({
    page,
    bot,
    chatId,
    caption,
}: {
    page: Page,
    bot: TelegramBot,
    chatId: number,
    caption: string,
}) => {
    const filename = getRandomString();
    Logger.getInfoLogger().log(`Saving page screenshot at file ${filename}.jpg`);
    await page.screenshot({
        path: './media/' + filename + '.jpg',
    });
    sendPhoto({
        bot: bot,
        chatId: chatId,
        filename: filename,
        caption: caption,
    });
}

export const visitLinkAndScrollToSelector = async ({
    link,
    bot,
    chatId,
    invalidHandler,
    selector,
    caption,
    setPixelCount,
    setSelector,
    setSelectorCount,
    toConfirmState,
    toIndexState,
}: {
    link: string,
    bot: TelegramBot,
    chatId: number,
    invalidHandler: () => void,
    selector: string,
    caption: string,
    setPixelCount: (chatId: number, pixelCount: number) => void,
    setSelector: (chatId: number, selector: string) => void,
    setSelectorCount: (chatId: number, selectorCount: number) => void,
    toConfirmState: () => void,
    toIndexState: () => void,
}) => {
    const { browser, page } = await launchBrowserAndPage();
    if (!await checkPageValidity({
        page: page,
        link: link,
        invalidHandler: invalidHandler,
    })) {
        browser.close();
        return;
    }

    const tryNumber = Number(selector);
    if (!isNaN(tryNumber)) {
        await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
        await screenshot({
            page: page,
            bot: bot,
            chatId: chatId,
            caption: caption,
        });
        setPixelCount(chatId, tryNumber);
        setTimeout(toConfirmState, 100);
        browser.close();
        return;
    }

    const elements = await page.$$(selector);
    if (elements.length === 1) {
        await page.evaluate((element: ElementHandle<NodeFor<string>>) => {
            element.scrollIntoView();
        }, elements[0]);
        await page.evaluate('window.scrollBy(0, -150)');
        await screenshot({
            page: page,
            bot: bot,
            chatId: chatId,
            caption: caption,
        });
        setSelector(chatId, selector);
        setTimeout(toConfirmState, 100);
    } else if (elements.length > 1) {
        setSelector(chatId, selector);
        setSelectorCount(chatId, elements.length);
        toIndexState();
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
};

export const visitLinkAndScrollToSelectorIndex = async ({
    indexString,
    bot,
    chatId,
    invalidHandler,
    caption,
    getSelectorCount,
    deleteUser,
    setIndex,
    getSelector,
    getLink,
    toConfirmState,
}: {
    indexString: string,
    bot: TelegramBot,
    chatId: number,
    invalidHandler: () => void,
    caption: string,
    getSelectorCount: (chatId: number) => number,
    deleteUser: (chatId: number) => void,
    setIndex: (chatId: number, index: number) => void,
    getSelector: (chatId: number) => string,
    getLink: (chatId: number) => string,
    toConfirmState: () => void,
}) => {
    const index = Number(indexString);
    const range = getSelectorCount(chatId);
    if (isNaN(index) || index >= range || index < 0) {
        bot.sendMessage(chatId, `Invalid index, index should be between 0 and ${range - 1} inclusive.`);
        return;
    }

    bot.sendMessage(chatId, "Alright, give me a second");
    setIndex(chatId, index);
    const selector = getSelector(chatId);
    const link = getLink(chatId);
    const { browser, page } = await launchBrowserAndPage();
    if (!await checkPageValidity({
        page: page,
        link: link,
        invalidHandler: invalidHandler,
    })) {
        browser.close();
        return;
    }

    const elements = await page.$$(selector);

    if (elements.length < index) {
        UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        deleteUser(chatId);
        bot.sendMessage(chatId, "Oops, the page appears to have changed as we are talking. Please start over again.");
        browser.close();
        return;
    }

    await page.evaluate((element: ElementHandle<NodeFor<string>>) => {
        element.scrollIntoView();
    }, elements[index]);
    await page.evaluate('window.scrollBy(0, -150)');
    await screenshot({
        page: page,
        bot: bot,
        chatId: chatId,
        caption: caption,
    });
    setTimeout(toConfirmState, 100);
    browser.close();
};

export const frequencyHandler = ({
    bot,
    chatId,
    query,
    toDailyState,
    toWeeklyState,
    toOnceState,
    setFrequency,
}: {
    bot: TelegramBot,
    chatId: number,
    query: CallbackQuery,
    toDailyState: () => void,
    toWeeklyState: () => void,
    toOnceState: () => void,
    setFrequency: (chatId: number, frequency: FrequencyType) => void,
}) => {
    const messageId = query.message!.message_id;
    const selectedOption: FrequencyType = query.data as FrequencyType;
    setFrequency(chatId, selectedOption);

    bot.editMessageText(
        `Alright, I will send you screenshots ${selectedOption}`,
        {
            chat_id: chatId,
            message_id: messageId,
        },
    );

    switch (selectedOption) {
        case 'daily':
            setTimeout(toDailyState, 100);
            bot.sendMessage(chatId, dailyPoll.question, {
                reply_markup: {
                    inline_keyboard: dailyPoll.options,
                },
            }).then(msg => {
                UserStates.setUserQuestionId(chatId, msg.message_id);
            });
            break;
        case 'weekly':
            setTimeout(toWeeklyState, 100);
            bot.sendMessage(chatId, weeklyPoll.question, {
                reply_markup: {
                    inline_keyboard: weeklyPoll.options,
                },
            }).then(msg => {
                UserStates.setUserQuestionId(chatId, msg.message_id);
            });
            break;
        case 'once':
            setTimeout(toOnceState, 100);
            bot.sendMessage(chatId, onceQuestion).then(msg => {
                UserStates.setUserQuestionId(chatId, msg.message_id);
            });
            break;
    }
}

export const setVisitJob = async ({
    query,
    bot,
    chatId,
    frequency,
    text,
}: {
    query: CallbackQuery,
    bot: TelegramBot,
    chatId: number,
    frequency: FrequencyType,
    text: (selectedOption: number) => string,
}) => {
    const messageId = query.message!.message_id;
    const selectedOption = Number(query.data);
    TrackMemory.setTime(chatId, selectedOption);

    bot.editMessageText(
        text(selectedOption),
        {
            chat_id: chatId,
            message_id: messageId,
        },
    );
    const { id, link, selector, index, caption } = await TrackMemory.build(chatId);
    const timezone = await getTimezone(chatId);
    await buildVisitJob({
        bot: bot,
        chatId: chatId,
        id: id,
        link: link,
        selector: selector,
        index: index,
        caption: caption,
        number: selectedOption,
        frequency: frequency,
        feedback: () => `Alright, I have set a website tracker for ${TrackMemory.getTracker(chatId, timezone)}`,
    });
};

export const setEditedVisitJob = async ({
    query,
    bot,
    chatId,
    text,
}: {
    query: CallbackQuery,
    bot: TelegramBot,
    chatId: number,
    text: (selectedOption: number) => string,
}) => {
    const messageId = query.message!.message_id;
    const selectedOption = Number(query.data);
    TrackEditMemory.setTime(chatId, selectedOption);

    bot.editMessageText(
        text(selectedOption),
        {
            chat_id: chatId,
            message_id: messageId,
        },
    );

    const tracker = await TrackEditMemory.build(chatId);
    const { id, address, selector, selectorIndex, caption, frequency, time } = tracker.dataValues;
    const timezone = await getTimezone(chatId);
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
        feedback: () => `Your tracker has been updated successfully to ${trackerDataToString(tracker, timezone)}.`,
    });
};

export const buildVisitJob = async ({
    bot,
    chatId,
    id,
    link,
    selector,
    index,
    caption,
    number,
    frequency,
    feedback,
}: {
    bot: TelegramBot,
    chatId: number,
    id: string,
    link: string,
    selector: string,
    index: number,
    caption: string,
    number: number,
    frequency: FrequencyType,
    feedback: () => string,
}) => {
    const isValid = () => Tracker.findOne({
        where: {
            id: id,
        },
    }).then(tracker => tracker !== null);
    const job = async () => {
        const { browser, page } = await launchBrowserAndPage();
        
        if (!await checkPageValidity({
            page: page,
            link: link,
            invalidHandler: () => bot.sendMessage(chatId, `Oops, looks like the page at ${link} has been removed.`),
        })) {
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

        await screenshot({
            page: page,
            bot: bot,
            chatId: chatId,
            caption: caption,
        });
        browser.close();
        return;
    };

    const timezone = await getTimezone(chatId);
    setReminder({
        number: number,
        frequency: frequency,
        job: job,
        isValid: isValid,
        timezone: timezone,
    });
    
    bot.sendMessage(chatId, feedback(), {
        parse_mode: "Markdown",
    });
};

export const checkDateString = async ({
    string,
    bot,
    chatId,
}: {
    string: string,
    bot: TelegramBot,
    chatId: number,
}): Promise<Date | undefined> => {
    const timezone = await getTimezone(chatId);
    const date: Date | undefined = parseDateTime(string, timezone);
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
    return date;
};
