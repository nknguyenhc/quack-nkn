import TelegramBot, { CallbackQuery, InlineKeyboardButton, Message } from "node-telegram-bot-api";
import ReminderMemory from './temp';
import { TextHandler, PlainHandler, PollAnswerHandler } from '../utils/types';
import UserStates from '../utils/states';
import { FrequencyType } from "./db";

const remindStartHandler: TextHandler = {
    command: /\/reminder/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        UserStates.setUserState(chatId, UserStates.STATE.REMINDER_START);
        ReminderMemory.setUser(chatId);
        bot.sendMessage(chatId, 'Alright, I am setting up a reminder for you. What do you want to remind yourself with?');
    },
};

const frequencyPoll: {
    question: string,
    options: InlineKeyboardButton[][],
} = {
    question: 'How frequently do you want me to remind you?',
    options: [
        [{
            text: 'Daily',
            callback_data: 'daily',
        }],
        [{
            text: 'Weekly',
            callback_data: 'weekly',
        }],
        [{
            text: 'Monthly',
            callback_data: 'monthly',
        }],
    ]
};

const reminderSetContentHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_START) {
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_FREQUENCY);
            ReminderMemory.setContent(chatId, msg.text);
            bot.sendMessage(chatId, frequencyPoll.question, {
                reply_markup: {
                    inline_keyboard: frequencyPoll.options,
                }
            })
        }
    }
};

const reminderFrequencyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId: number = query.message.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_FREQUENCY) {
            const messageId: number = query.message.message_id;
            const selectedOption: FrequencyType = query.data as FrequencyType;
            ReminderMemory.setFrequency(chatId, selectedOption);
            await ReminderMemory.build(chatId);

            const reminderContent: string = ReminderMemory.getReminder(chatId);
            bot.editMessageText(
                `Alright, I have set reminder for ${reminderContent}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                }
            );
        }
    }
}

export const textReminderHandlers: Array<TextHandler> = [
    remindStartHandler,
];

export const plainReminderHandlers: Array<PlainHandler> = [
    reminderSetContentHandler,
];

export const pollAnswerReminderHandlers: Array<PollAnswerHandler> = [
    reminderFrequencyHandler,
];
