import TelegramBot from 'node-telegram-bot-api';
import { StartBotJob } from '../utils/types';
import { Tracker } from './db';
import { setReminder } from '../utils/schedule';
import { launch } from 'puppeteer';
import { getRandomString } from '../utils/primitives';
import { unlink } from 'fs';

const trackStartJob: StartBotJob = async (bot: TelegramBot) => {
    const trackers = await Tracker.findAll();
    trackers.forEach(tracker => {
        if (tracker.dataValues.frequency === 'once' && tracker.dataValues.time * 1000 < new Date().getTime()) {
            return;
        }
        const { id, address, selector, selectorIndex, caption, frequency, time, userChatId } = tracker.dataValues;
        const job = async () => {
            const browser = await launch();
            const page = await browser.newPage();
            page.setViewport({
                width: 1440,
                height: 715,
            });
            
            try {
                await page.goto(address);
            } catch (e) {
                bot.sendMessage(userChatId, `Oops, looks like the page at ${address} has been removed.`);
                return;
            }

            const tryNumber = Number(selector);
            if (!isNaN(tryNumber)) {
                await page.evaluate(`window.scrollBy(0, ${tryNumber})`);
            } else {
                const elements = await page.$$(selector);
                if (elements.length >= 1) {
                    const element = selectorIndex && selectorIndex < elements.length ? elements[selectorIndex] : elements[0];
                    await page.evaluate((element) => {
                        element.scrollIntoView();
                    }, element);
                    await page.evaluate('window.scrollBy(0, -150)');
                }
            }

            const filename = getRandomString();
            await page.screenshot({
                path: './media/' + filename + '.jpg',
            });
            bot.sendPhoto(userChatId, 'media/' + filename + '.jpg', {
                caption: caption,
            }).then(() => {
                unlink('media/' + filename + '.jpg', () => {});
            });
        };
        const isValid = () => Tracker.findOne({
            where: {
                id: id,
            },
        }).then(tracker => tracker !== null);

        setReminder({
            number: time,
            frequency: frequency,
            job: job,
            isValid: isValid,
        });
    })
};

export default trackStartJob;
