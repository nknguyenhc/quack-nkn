import TelegramBot from 'node-telegram-bot-api';
import { Reminder } from '../reminder/db';
import { getRandomString, timeDailyDelta, timeWeeklyDelta, timeOnceDelta } from '../utils/primitives';
import { setReminder } from '../utils/schedule';
import { Tracker } from '../tracker/db';
import { checkPageValidity, getDomElements, launchBrowserAndPage, screenshot } from '../tracker/functions';
import { User } from './db';
import { sendPhoto } from '../utils/bot';

type TimezoneDict = {
    [key: number]: {
        original: number,
        final?: number,
    },
};

export class TimezoneTemp {
    static #timezones: TimezoneDict = {};

    static setCurrTimezone(chatId: number, timezone: number) {
        TimezoneTemp.#timezones[chatId] = {
            original: timezone,
        };
    }

    static setFinalTimezone(chatId: number, timezone: number) {
        TimezoneTemp.#timezones[chatId].final = timezone;
    }

    static async buildNoChange(chatId: number, bot: TelegramBot) {
        const newTimezone = TimezoneTemp.#timezones[chatId].final as number;
        const difference = newTimezone - TimezoneTemp.#timezones[chatId].original;
        await TimezoneTemp.changeTimezone(chatId);
        delete TimezoneTemp.#timezones[chatId];

        const reminders = await Reminder.findAll({
            where: { userChatId: String(chatId) },
        });
        reminders.forEach(async reminder => {
            const { id, content, frequency, time } = reminder.dataValues;
            const newId = getRandomString();
            let newScheduledTime: number = time;
            if (frequency === 'once') {
                const newTime = timeOnceDelta(time, -difference);
                newScheduledTime = newTime;
                await Reminder.update({
                    id: newId,
                    time: newTime,
                }, {
                    where: { id: id },
                });
                if (newTime < new Date().getTime() / 1000) {
                    return;
                }
            } else {
                await Reminder.update({
                    id: newId,
                }, {
                    where: { id: id },
                });
            }

            const isValid = () => Reminder.findOne({
                where: { id: newId },
            }).then(reminder => reminder !== null);
            const job = () => bot.sendMessage(chatId, content);
            setReminder({
                number: newScheduledTime,
                frequency: frequency,
                job: job,
                isValid: isValid,
                timezone: newTimezone,
            });
        });

        const trackers = await Tracker.findAll({
            where: { userChatId: String(chatId) },
        });
        trackers.forEach(async tracker => {
            const { id, address, selector, selectorIndex, caption, frequency, time } = tracker.dataValues;
            const newId = getRandomString();
            let newScheduledTime: number = time;
            if (frequency === 'once') {
                const newTime = timeOnceDelta(time, -difference);
                newScheduledTime = newTime;
                await Tracker.update({
                    id: newId,
                    time: newTime,
                }, {
                    where: { id: id },
                });
                if (newTime * 1000 < new Date().getTime()) {
                    return;
                }
            } else {
                await Tracker.update({
                    id: newId,
                }, {
                    where: { id: id },
                });
            }

            const job = async () => {
                const { browser, page } = await launchBrowserAndPage();
                if (!await checkPageValidity({
                    page: page,
                    link: address,
                    invalidHandler: () => bot.sendMessage(chatId, `Oops, looks like the page at ${address} has been removed.`),
                })) {
                    browser.close();
                    return;
                }

                const tryNumber = Number(selector);
                if (!isNaN(tryNumber)) {
                    await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
                } else {
                    const elements = await getDomElements({
                        page: page,
                        selector: selector,
                    });
                    if (elements.length >= 1) {
                        const element = selectorIndex && selectorIndex < elements.length ? elements[selectorIndex] : elements[0];
                        await page.evaluate((element) => {
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
            };
            const isValid = () => Tracker.findOne({
                where: { id: newId },
            }).then(tracker => tracker !== null);
            setReminder({
                number: newScheduledTime,
                frequency: frequency,
                job: job,
                isValid: isValid,
                timezone: newTimezone,
            });
        });
    }

    static async buildChange(chatId: number) {
        const { original, final } = TimezoneTemp.#timezones[chatId];
        const difference = (final as number) - original;
        await TimezoneTemp.changeTimezone(chatId);
        delete TimezoneTemp.#timezones[chatId];

        const reminders = await Reminder.findAll({
            where: { userChatId: String(chatId) },
        });
        reminders.forEach(async reminder => {
            const { id, frequency, time } = reminder.dataValues;
            switch (frequency) {
                case 'daily':
                    await Reminder.update({
                        time: timeDailyDelta(time, difference),
                    }, {
                        where: { id: id },
                    });
                    break;
                case 'weekly':
                    await Reminder.update({
                        time: timeWeeklyDelta(time, difference),
                    }, {
                        where: { id: id },
                    });
                    break;
                case 'once':
                    break;
            }
        });

        const trackers = await Tracker.findAll({
            where: { userChatId: String(chatId) },
        });
        trackers.forEach(async tracker => {
            const { id, frequency, time } = tracker.dataValues;
            switch (frequency) {
                case 'daily':
                    await Reminder.update({
                        time: timeDailyDelta(time, difference),
                    }, {
                        where: { id: id },
                    });
                    break;
                case 'weekly':
                    await Reminder.update({
                        time: timeWeeklyDelta(time, difference),
                    }, {
                        where: { id: id },
                    });
                    break;
                case 'once':
                    break;
            }
        });
    }

    static async changeTimezone(chatId: number) {
        await User.update({
            timezone: TimezoneTemp.#timezones[chatId].final as number,
        }, {
            where: {
                chatId: String(chatId),
            },
        });
    }

    static async cancel(chatId: number) {
        delete TimezoneTemp.#timezones[chatId];
    }
}

export class UserManager {
    static #blocked: Set<number> = new Set();

    static async loadUsers() {
        await User.findAll().then(persons => {
            UserManager.#blocked = new Set(persons
                .filter(person => person.dataValues.isBlocked)
                .map(person => Number(person.dataValues.chatId)));
        });
    }

    static isUserBlocked(chatId: number): boolean {
        return UserManager.#blocked.has(chatId);
    }
}
