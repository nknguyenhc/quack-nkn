import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { ReminderDeleteMemory, ReminderEditMemory, ReminderMemory } from './temp';
import { TextHandler, PlainHandler, PollAnswerHandler } from '../utils/types';
import UserStates from '../utils/states';
import { frequencyPoll, typePoll } from './data';
import { numberToTime, weeklyNumberToString } from "../utils/primitives";
import { addReminder, addReminderWithNumber, checkDateString, editReminder, editReminderWithNumber, listingAllReminders, recordFrequency, sendTimeQuestion } from "./functions";
import Logger from "../logging/logger";

const remindStartHandler: TextHandler = {
    command: /^\/reminder$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.NORMAL) {
            Logger.getInfoLogger().commandLog(chatId, "/reminder");
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_START);
            bot.sendMessage(chatId, 
                'What do you wish to do?\n'
                + '/add - add a new reminder\n'
                + '/list - view your current reminders\n'
                + '/edit - edit one of your reminders\n'
                + '/delete - delete one of your reminders');
        }
    },
};

const reminderAddHandler: TextHandler = {
    command: /^\/add$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_START) {
            Logger.getInfoLogger().commandLog(chatId, "/add");
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_ADD);
            ReminderMemory.setUser(chatId);
            bot.sendMessage(chatId, 'Alright, I am setting up a reminder for you. What do you want to remind yourself with?');
        }
    },
};

const addReminderHandler: TextHandler = {
    command: /^\/reminder$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.ADD) {
            Logger.getInfoLogger().commandLog(chatId, "/reminder");
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_ADD);
            ReminderMemory.setUser(chatId);
            bot.sendMessage(chatId, 'Alright, I am setting up a reminder for you. What do you want to remind yourself with?');
        }
    },
};

const reminderListHandler: TextHandler = {
    command: /^\/list$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_START) {
            Logger.getInfoLogger().commandLog(chatId, "/list");
            if (await listingAllReminders({
                bot: bot,
                chatId: chatId,
            })) {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            }
        }
    },
};

const listReminderHandler: TextHandler = {
    command: /^\/reminder$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.LIST) {
            Logger.getInfoLogger().commandLog(chatId, "/reminder");
            if (await listingAllReminders({
                bot: bot,
                chatId: chatId,
            })) {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            }
        }
    },
};

const reminderEditHandler: TextHandler = {
    command: /^\/edit$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_START) {
            Logger.getInfoLogger().commandLog(chatId, "/edit");
            const isNonEmptyList = await listingAllReminders({
                bot: bot,
                chatId: chatId, 
                tempSetter: allReminders => ReminderEditMemory.setUser(chatId, allReminders.map(reminder => reminder.dataValues.id)),
                lastNote: "Which task do you want to edit? Key in the index of the task",
            });
            if (isNonEmptyList) {
                UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT);
            }
        }
    },
};

const editReminderHandler: TextHandler = {
    command: /^\/reminder$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.EDIT) {
            Logger.getInfoLogger().commandLog(chatId, "/reminder");
            const isNonEmptyList = await listingAllReminders({
                bot: bot,
                chatId: chatId, 
                tempSetter: allReminders => ReminderEditMemory.setUser(chatId, allReminders.map(reminder => reminder.dataValues.id)),
                lastNote: "Which task do you want to edit? Key in the index of the task",
            });
            if (isNonEmptyList) {
                UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT);
            }
        }
    },
};

const reminderDeleteHandler: TextHandler = {
    command: /^\/delete$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_START) {
            Logger.getInfoLogger().commandLog(chatId, "/delete");
            const isNonEmptyList = await listingAllReminders({
                bot: bot,
                chatId: chatId,
                tempSetter: allReminders => ReminderDeleteMemory.setUser(chatId, allReminders.map(reminder => reminder.dataValues.id)),
                lastNote:"Which task do you want to delete? Key in the index of the task",
            })
            if (isNonEmptyList) {
                UserStates.setUserState(chatId, UserStates.STATE.REMINDER_DELETE);
            }
        }
    },
};

const deleteReminderHandler: TextHandler = {
    command: /^\/reminder$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.DELETE) {
            Logger.getInfoLogger().commandLog(chatId, "/reminder");
            const isNonEmptyList = await listingAllReminders({
                bot: bot,
                chatId: chatId,
                tempSetter: allReminders => ReminderDeleteMemory.setUser(chatId, allReminders.map(reminder => reminder.dataValues.id)),
                lastNote:"Which task do you want to delete? Key in the index of the task",
            })
            if (isNonEmptyList) {
                UserStates.setUserState(chatId, UserStates.STATE.REMINDER_DELETE);
            }
        }
    },
};

const reminderSetContentHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_ADD) {
            Logger.getInfoLogger().messageLog(chatId, msg.text)
            ReminderMemory.setContent(chatId, msg.text!);
            setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_FREQUENCY), 100);
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

const reminderFrequencyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId: number = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_FREQUENCY) {
            Logger.getInfoLogger().pollAnswerLog(chatId, query.data);
            recordFrequency({
                bot: bot,
                chatId: chatId,
                query: query,
                tempSetter: ReminderMemory.setFrequency,
                setDailyState: () => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_DAILY),
                setWeeklyState: () => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_WEEKLY),
                setOnceState: () => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_ONCE),
            });
        }
    },
};

const reminderDailyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_DAILY) {
            Logger.getInfoLogger().pollAnswerLog(chatId, query.data);
            addReminder({
                query: query,
                editedText: selectedOption => `You selected: ${numberToTime(selectedOption)}`,
                bot: bot,
                chatId: chatId,
                frequency: 'daily',
            });
        }
    },
};

const reminderWeeklyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_WEEKLY) {
            Logger.getInfoLogger().pollAnswerLog(chatId, query.data);
            addReminder({
                query: query,
                editedText: selectedOption => `You selected: ${weeklyNumberToString(selectedOption)}.`,
                bot: bot,
                chatId: chatId,
                frequency: 'weekly',
            });
        }
    },
};

const reminderOnceHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_ONCE) {
            Logger.getInfoLogger().messageLog(chatId, msg.text);
            const date = await checkDateString({
                string: msg.text!,
                bot: bot,
                chatId: chatId,
            });
            if (!date) {
                return;
            }
            addReminderWithNumber({
                number: date.getTime() / 1000,
                bot: bot,
                chatId: chatId,
                frequency: 'once',
            });
        }
    },
};

const reminderEditIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT) {
            Logger.getInfoLogger().messageLog(chatId, msg.text);
            const index = Number(msg.text);
            const edited = ReminderEditMemory.setIndex(chatId, index);
            if (!edited) {
                bot.sendMessage(chatId, 'Oops, invalid index!');
                return;
            }

            setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_TYPE), 100);
            bot.sendMessage(chatId, typePoll.question, {
                reply_markup: {
                    inline_keyboard: typePoll.options,
                },
            }).then((msg) => {
                UserStates.setUserQuestionId(chatId, msg.message_id);
            });
        }
    }
};

const reminderTypeHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_TYPE) {
            Logger.getInfoLogger().pollAnswerLog(chatId, query.data);
            const messageId = query.message!.message_id;
            const selectedOption = query.data;
            bot.editMessageText(
                `You choose: ${selectedOption}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            switch (selectedOption) {
                case 'content':
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_CONTENT);
                    bot.sendMessage(chatId, 'Alright, what do you want to remind yourself with?');
                    break;
                case 'frequency':
                    setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_FREQUENCY), 100);
                    bot.sendMessage(chatId, frequencyPoll.question, {
                        reply_markup: {
                            inline_keyboard: frequencyPoll.options,
                        }
                    }).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
                case 'time':
                    const currFrequency = await ReminderEditMemory.autoSetFrequency(chatId);
                    sendTimeQuestion({
                        bot: bot,
                        chatId: chatId,
                        frequency: currFrequency,
                        setDailyState: () => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_DAILY),
                        setWeeklyState: () => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_WEEKLY),
                        setOnceState: () => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_ONCE),
                    });
            }
        }
    }
};

const reminderEditContentHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_CONTENT) {
            Logger.getInfoLogger().messageLog(chatId, msg.text);
            const newContent = msg.text!;
            ReminderEditMemory.setContent(chatId, newContent);
            editReminderWithNumber({
                bot: bot,
                chatId: chatId,
            });
        }
    }
};

const reminderEditFrequencyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_FREQUENCY) {
            Logger.getInfoLogger().pollAnswerLog(chatId, query.data);
            recordFrequency({
                bot: bot,
                chatId: chatId,
                query: query,
                tempSetter: ReminderEditMemory.setFrequency,
                setDailyState: () => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_DAILY),
                setWeeklyState: () => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_WEEKLY),
                setOnceState: () => UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_ONCE),
            });
        }
    },
};

const reminderEditDailyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_DAILY) {
            Logger.getInfoLogger().pollAnswerLog(chatId, query.data);
            editReminder({
                query: query,
                editedText: (selectedOption) => `You selected: ${numberToTime(selectedOption)}`,
                bot: bot,
                chatId: chatId,
            });
        }
    },
};

const reminderEditWeeklyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_WEEKLY) {
            Logger.getInfoLogger().pollAnswerLog(chatId, query.data);
            editReminder({
                query: query,
                editedText: (selectedOption) => `You selected: ${numberToTime(selectedOption)}`,
                bot: bot,
                chatId: chatId,
            });
        }
    },
};

const reminderEditOnceHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_ONCE) {
            Logger.getInfoLogger().messageLog(chatId, msg.text);
            const date = await checkDateString({
                string: msg.text!,
                bot: bot,
                chatId: chatId,
            });
            if (!date) {
                return;
            }
            ReminderEditMemory.setTime(chatId, date.getTime() / 1000);
            editReminderWithNumber({
                bot: bot,
                chatId: chatId,
            });
        }
    },
};

const reminderDeleteIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_DELETE) {
            Logger.getInfoLogger().messageLog(chatId, msg.text);
            const index = Number(msg.text);
            const isDeleted = ReminderDeleteMemory.deleteReminder(chatId, index);
            if (await isDeleted) {
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                bot.sendMessage(chatId, `Alright, reminder ${index} has been deleted.`);
            } else {
                bot.sendMessage(chatId, `Index must be an integer between 1 and ${ReminderDeleteMemory.getReminderCount(chatId)}.`);
            }
        }
    },
};

export const textReminderHandlers: Array<TextHandler> = [
    remindStartHandler,
    reminderAddHandler,
    addReminderHandler,
    reminderListHandler,
    listReminderHandler,
    reminderEditHandler,
    editReminderHandler,
    reminderDeleteHandler,
    deleteReminderHandler,
];

export const plainReminderHandlers: Array<PlainHandler> = [
    reminderSetContentHandler,
    reminderOnceHandler,
    reminderEditIndexHandler,
    reminderEditContentHandler,
    reminderEditOnceHandler,
    reminderDeleteIndexHandler,
];

export const pollAnswerReminderHandlers: Array<PollAnswerHandler> = [
    reminderFrequencyHandler,
    reminderDailyHandler,
    reminderWeeklyHandler,
    reminderTypeHandler,
    reminderEditDailyHandler,
    reminderEditWeeklyHandler,
    reminderEditFrequencyHandler,
];
