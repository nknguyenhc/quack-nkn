import TelegramBot from "node-telegram-bot-api";
import { Reminder } from './db';
import { setReminder } from "../utils/schedule";
import { StartBotJob } from '../utils/types';
import { User } from "../users/db";

const reminderStartJob: StartBotJob = async (bot: TelegramBot) => {
    const reminders = await Reminder.findAll();
    reminders.forEach(async reminder => {
        if (reminder.dataValues.frequency === 'once' && reminder.dataValues.time * 1000 < new Date().getTime()) {
            return;
        }
        const job = async () => {
            await bot.sendMessage(reminder.dataValues.userChatId, reminder.dataValues.content);
        };
        const reminderId = reminder.dataValues.id;
        const isValid = () => Reminder.findOne({
            where: {
                id: reminderId,
            }
        }).then(reminder => reminder !== null);

        const timezone = (await User.findOne({
            where: {
                chatId: reminder.dataValues.userChatId,
            },
        })).dataValues.timezone;
        setReminder({
            number: reminder.dataValues.time,
            frequency: reminder.dataValues.frequency,
            job: job,
            isValid: isValid,
            timezone: timezone,
        });
    })
}

export default reminderStartJob;
