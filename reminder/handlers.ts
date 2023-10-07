import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import ReminderMemory from './temp';
import { TextHandler, PlainHandler, PollAnswerHandler } from '../utils/types';
import UserStates from '../utils/states';
import { FrequencyType } from "./db";
import { dailyPoll, frequencyPoll, weeklyPoll } from './data';
import { numberToTime, parseDateTime } from "../utils/primitives";
import { scheduleJob } from "node-schedule";

const setReminder = (number: number, frequency: FrequencyType): void => {
    switch (frequency) {
        case 'daily':
            scheduleJob
            break;
        case 'weekly':
            break;
        case 'once':
            break;
    }
}

const remindStartHandler: TextHandler = {
    command: /\/reminder/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        UserStates.setUserState(chatId, UserStates.STATE.REMINDER_START);
        ReminderMemory.setUser(chatId);
        bot.sendMessage(chatId, 'Alright, I am setting up a reminder for you. What do you want to remind yourself with?');
    },
};

const reminderSetContentHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_START) {
            ReminderMemory.setContent(chatId, msg.text);
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_FREQUENCY);
            bot.sendMessage(chatId, frequencyPoll.question, {
                reply_markup: {
                    inline_keyboard: frequencyPoll.options,
                },
            });
        }
    },
};

const reminderFrequencyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId: number = query.message.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_FREQUENCY
                && query.message.text === frequencyPoll.question) {
            const messageId: number = query.message.message_id;
            const selectedOption: FrequencyType = query.data as FrequencyType;
            ReminderMemory.setFrequency(chatId, selectedOption);

            bot.editMessageText(
                `Alright, I will set reminder ${selectedOption}.`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            switch (selectedOption) {
                case 'daily':
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_DAILY);
                    bot.sendMessage(chatId, dailyPoll.question, {
                        reply_markup: {
                            inline_keyboard: dailyPoll.options,
                        },
                    });
                    break;
                case 'weekly':
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_WEEKLY);
                    bot.sendMessage(chatId, weeklyPoll.question, {
                        reply_markup: {
                            inline_keyboard: weeklyPoll.options,
                        },
                    });
                    break;
                case 'once':
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_ONCE);
                    bot.sendMessage(chatId, 
                        'When do you want me to remind you?\n'
                        + 'Please key in time in the following format: DD/MM/YYYY HH:MM');
                    break;
            }
        }
    },
};

const reminderDailyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_DAILY
                && query.message.text === dailyPoll.question) {
            const messageId: number = query.message.message_id;
            const selectedOption = Number(query.data);
            ReminderMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${numberToTime(selectedOption)}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );
            
            await ReminderMemory.build(chatId);
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have set reminder for ${ReminderMemory.getReminder(chatId)}.`);
        }
    },
};

const reminderWeeklyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_WEEKLY
                && query.message.text === weeklyPoll.question) {
            const messageId: number = query.message.message_id;
            const selectedOption = Number(query.data);
            ReminderMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${ReminderMemory.weeklyNumberToString(selectedOption)}.`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            await ReminderMemory.build(chatId);
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have set reminder for ${ReminderMemory.getReminder(chatId)}.`);
        }
    },
};

const reminderOnceHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_ONCE) {
            const date: Date | undefined = parseDateTime(msg.text);
            if (!date) {
                bot.sendMessage(chatId, "Oops, I do not understand your datetime.");
                return;
            }
            ReminderMemory.setTime(chatId, date.getTime() / 1000);

            await ReminderMemory.build(chatId);
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have set reminder for ${ReminderMemory.getReminder(chatId)}.`);
        }
    },
};

export const textReminderHandlers: Array<TextHandler> = [
    remindStartHandler,
];

export const plainReminderHandlers: Array<PlainHandler> = [
    reminderSetContentHandler,
    reminderOnceHandler,
];

export const pollAnswerReminderHandlers: Array<PollAnswerHandler> = [
    reminderFrequencyHandler,
    reminderDailyHandler,
    reminderWeeklyHandler,
];
