import TelegramBot from 'node-telegram-bot-api';
import { StartBotJob } from '../utils/types';
import { Tracker } from './db';
import { setReminder } from '../utils/schedule';
import { checkPageValidity, getDomElements, launchBrowserAndPage, screenshot } from './functions';
import { User } from '../users/db';

const trackStartJob: StartBotJob = async (bot: TelegramBot) => {
    const trackers = await Tracker.findAll();
    trackers.forEach(async tracker => {
        if (tracker.dataValues.frequency === 'once' && tracker.dataValues.time * 1000 < new Date().getTime()) {
            return;
        }
        const { id, address, selector, selectorIndex, caption, frequency, time, userChatId } = tracker.dataValues;
        const job = async () => {
            const { browser, page } = await launchBrowserAndPage();
            if (!await checkPageValidity({
                page: page,
                link: address,
                invalidHandler: () => bot.sendMessage(userChatId, `Oops, looks like the page at ${address} has been removed.`),
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
                chatId: Number(userChatId),
                caption: caption,
            });
            browser.close();
        };
        const isValid = () => Tracker.findOne({
            where: {
                id: id,
            },
        }).then(tracker => tracker !== null);

        const timezone = (await User.findOne({
            where: {
                chatId: tracker.dataValues.userChatId,
            },
        })).dataValues.timezone;
        setReminder({
            number: time,
            frequency: frequency,
            job: job,
            isValid: isValid,
            timezone: timezone,
        });
    })
};

export default trackStartJob;
