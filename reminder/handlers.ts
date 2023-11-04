import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { ReminderDeleteMemory, ReminderEditMemory, ReminderMemory } from './temp';
import { TextHandler, PlainHandler, PollAnswerHandler } from '../utils/types';
import UserStates from '../utils/states';
import { Reminder, ReminderType } from "./db";
import { dailyPoll, frequencyPoll, onceQuestion, typePoll, weeklyPoll } from './data';
import { numberToTime, numberToTimeString, parseDateTime, weeklyNumberToString } from "../utils/primitives";
import { FrequencyType, setReminder } from "../utils/schedule";
import { Model } from "sequelize";

const reminderDataToString = (reminder: Model<ReminderType, ReminderType>): string => {
    return `${
        reminder.dataValues.content
    } (${
        reminder.dataValues.frequency
    }) ${
        numberToTimeString(reminder.dataValues.time, reminder.dataValues.frequency)
    }`;
}

const remindStartHandler: TextHandler = {
    command: /^\/reminder$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.NORMAL) {
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
            const allReminders = await Reminder.findAll({
                where: {
                    userChatId: String(chatId),
                },
            });
            if (allReminders.length === 0) {
                bot.sendMessage(chatId, "You have no reminders yet.");
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            let message = 'Alright, here is your list of reminders:';
            allReminders.forEach((reminder, reminderIndex) => {
                message += `\n${reminderIndex + 1}. ${reminderDataToString(reminder)}`;
            });
            bot.sendMessage(chatId, message);
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const listReminderHandler: TextHandler = {
    command: /^\/reminder$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.LIST) {
            const allReminders = await Reminder.findAll({
                where: {
                    userChatId: String(chatId),
                },
            });
            if (allReminders.length === 0) {
                bot.sendMessage(chatId, "You have no reminders yet.");
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            let message = 'Alright, here is your list of reminders:';
            allReminders.forEach((reminder, reminderIndex) => {
                message += `\n${reminderIndex + 1}. ${reminderDataToString(reminder)}`;
            });
            bot.sendMessage(chatId, message);
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        }
    },
};

const reminderEditHandler: TextHandler = {
    command: /^\/edit$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_START) {
            const allReminders = await Reminder.findAll({
                where: {
                    userChatId: String(chatId),
                },
            });
            if (allReminders.length === 0) {
                bot.sendMessage(chatId, "You have no reminders to edit yet.");
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            ReminderEditMemory.setUser(chatId, allReminders.map(reminder => reminder.dataValues.id));
            let message = 'Here is your list of reminders:';
            allReminders.forEach((reminder, reminderIndex) => {
                message += `\n${reminderIndex + 1}. ${reminderDataToString(reminder)}`;
            });
            message += '\nWhich task do you want to edit? Key in the index of the task';
            bot.sendMessage(chatId, message);
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT);
        }
    },
};

const editReminderHandler: TextHandler = {
    command: /^\/reminder$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.EDIT) {
            const allReminders = await Reminder.findAll({
                where: {
                    userChatId: String(chatId),
                },
            });
            if (allReminders.length === 0) {
                bot.sendMessage(chatId, "You have no reminders to edit yet.");
                UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
                return;
            }

            ReminderEditMemory.setUser(chatId, allReminders.map(reminder => reminder.dataValues.id));
            let message = 'Here is your list of reminders:';
            allReminders.forEach((reminder, reminderIndex) => {
                message += `\n${reminderIndex + 1}. ${reminderDataToString(reminder)}`;
            });
            message += '\nWhich task do you want to edit? Key in the index of the task';
            bot.sendMessage(chatId, message);
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT);
        }
    },
};

const reminderDeleteHandler: TextHandler = {
    command: /^\/delete$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_START) {
            const reminders = (await Reminder.findAll({
                where: { userChatId: String(chatId) },
            }));
            ReminderDeleteMemory.setUser(chatId, reminders.map(reminder => reminder.dataValues.id));
            let message = 'Here is your list of reminders:';
            reminders.forEach((reminder, reminderIndex) => {
                message += `\n${reminderIndex + 1}. ${reminderDataToString(reminder)}`;
            });
            message += `\nWhich task do you want to delete? Key in the index of the task`;
            bot.sendMessage(chatId, message);
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_DELETE);
        }
    },
};

const deleteReminderHandler: TextHandler = {
    command: /^\/reminder$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.DELETE) {
            const reminders = (await Reminder.findAll({
                where: { userChatId: String(chatId) },
            }));
            ReminderDeleteMemory.setUser(chatId, reminders.map(reminder => reminder.dataValues.id));
            let message = 'Here is your list of reminders:';
            reminders.forEach((reminder, reminderIndex) => {
                message += `\n${reminderIndex + 1}. ${reminderDataToString(reminder)}`;
            });
            message += `\nWhich task do you want to delete? Key in the index of the task`;
            bot.sendMessage(chatId, message);
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_DELETE);
        }
    },
};

const reminderSetContentHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_ADD) {
            ReminderMemory.setContent(chatId, msg.text!);
            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_FREQUENCY);
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
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_FREQUENCY
                && query.message!.text === frequencyPoll.question) {
            const messageId: number = query.message!.message_id;
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
                    }).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
                case 'weekly':
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_WEEKLY);
                    bot.sendMessage(chatId, weeklyPoll.question, {
                        reply_markup: {
                            inline_keyboard: weeklyPoll.options,
                        },
                    }).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
                case 'once':
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_ONCE);
                    bot.sendMessage(chatId, onceQuestion).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
            }
        }
    },
};

const reminderDailyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_DAILY
                && query.message!.text === dailyPoll.question) {
            const messageId: number = query.message!.message_id;
            const selectedOption = Number(query.data);
            ReminderMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${numberToTime(selectedOption)}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );
            
            const id = await ReminderMemory.build(chatId);
            const message = ReminderMemory.getMessage(chatId);
            const isValid = () => Reminder.findOne({
                where: {
                    id: id,
                },
            }).then(reminder => reminder !== null);
            const job = () => bot.sendMessage(chatId, message);
            setReminder({
                number: selectedOption,
                frequency: 'daily',
                job: job,
                isValid: isValid,
            });

            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have set reminder for ${ReminderMemory.getReminder(chatId)}.`);
        }
    },
};

const reminderWeeklyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_WEEKLY
                && query.message!.text === weeklyPoll.question) {
            const messageId: number = query.message!.message_id;
            const selectedOption = Number(query.data);
            ReminderMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${weeklyNumberToString(selectedOption)}.`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            const id = await ReminderMemory.build(chatId);
            const message = ReminderMemory.getMessage(chatId);
            const isValid = () => Reminder.findOne({
                where: {
                    id: id,
                },
            }).then(reminder => reminder !== null);
            const job = () => bot.sendMessage(chatId, message);
            setReminder({
                number: selectedOption,
                frequency: 'weekly',
                job: job,
                isValid: isValid,
            });

            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have set reminder for ${ReminderMemory.getReminder(chatId)}.`);
        }
    },
};

const reminderOnceHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_ONCE) {
            const date: Date | undefined = parseDateTime(msg.text!);
            if (!date || isNaN(date.getTime())) {
                bot.sendMessage(chatId, "Oops, I do not understand your datetime.");
                return;
            }
            if (date < new Date()) {
                bot.sendMessage(chatId, "Oops, you cannot set reminder for something in the past.");
                return;
            }
            if (date > new Date(2030, 11, 31)) {
                bot.sendMessage(chatId, "Oops, you cannot set reminder for something beyond the year of 2030.");
                return;
            }
            ReminderMemory.setTime(chatId, date.getTime() / 1000);

            const id = await ReminderMemory.build(chatId);
            const message = ReminderMemory.getMessage(chatId);
            const isValid = () => Reminder.findOne({
                where: {
                    id: id,
                }
            }).then(reminder => reminder !== null);
            const job = () => bot.sendMessage(chatId, message);
            setReminder({
                number: date.getTime() / 1000,
                frequency: 'once',
                job: job,
                isValid: isValid,
            });

            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have set reminder for ${ReminderMemory.getReminder(chatId)}.`);
        }
    },
};

const reminderEditIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT) {
            const index = Number(msg.text);
            const edited = ReminderEditMemory.setIndex(chatId, index);
            if (!edited) {
                bot.sendMessage(chatId, 'Oops, invalid index!');
                return;
            }

            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_TYPE);
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
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_TYPE
                && query.message!.text === typePoll.question) {
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
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_FREQUENCY);
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
                    switch (currFrequency) {
                        case 'daily':
                            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_DAILY);
                            bot.sendMessage(chatId, dailyPoll.question, {
                                reply_markup: {
                                    inline_keyboard: dailyPoll.options,
                                },
                            }).then((msg) => {
                                UserStates.setUserQuestionId(chatId, msg.message_id);
                            });
                            break;
                        case 'weekly':
                            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_WEEKLY);
                            bot.sendMessage(chatId, weeklyPoll.question, {
                                reply_markup: {
                                    inline_keyboard: weeklyPoll.options,
                                },
                            }).then((msg) => {
                                UserStates.setUserQuestionId(chatId, msg.message_id);
                            });
                            break;
                        case 'once':
                            UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_ONCE);
                            bot.sendMessage(chatId, onceQuestion);
                            break;
                    }
                    break;
            }
        }
    }
};

const reminderEditContentHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_CONTENT) {
            const newContent = msg.text!;
            ReminderEditMemory.setContent(chatId, newContent);

            const { id, content, frequency, time } = await ReminderEditMemory.build(chatId);
            const isValid = () => Reminder.findOne({
                where: { id: id },
            }).then(reminder => reminder !== null);
            const job = () => bot.sendMessage(chatId, content);
            setReminder({
                number: time,
                frequency: frequency,
                job: job,
                isValid: isValid,
            });

            const [type, changed] = ReminderEditMemory.getReminder(chatId);
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have changed the ${type} of the reminder to ${changed}`);
        }
    }
};

const reminderEditFrequencyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_FREQUENCY
                && query.message!.text === frequencyPoll.question) {
            const messageId = query.message!.message_id;
            const selectedOption: FrequencyType = query.data as FrequencyType;
            ReminderEditMemory.setFrequency(chatId, selectedOption);

            bot.editMessageText(
                `Alright, I will set reminder ${selectedOption}.`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            switch (selectedOption) {
                case 'daily':
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_DAILY);
                    bot.sendMessage(chatId, dailyPoll.question, {
                        reply_markup: {
                            inline_keyboard: dailyPoll.options,
                        },
                    }).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
                case 'weekly':
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_WEEKLY);
                    bot.sendMessage(chatId, weeklyPoll.question, {
                        reply_markup: {
                            inline_keyboard: weeklyPoll.options,
                        },
                    }).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
                case 'once':
                    UserStates.setUserState(chatId, UserStates.STATE.REMINDER_EDIT_ONCE);
                    bot.sendMessage(chatId, onceQuestion).then(msg => {
                        UserStates.setUserQuestionId(chatId, msg.message_id);
                    });
                    break;
            }
        }
    },
};

const reminderEditDailyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_DAILY
                && query.message!.text === dailyPoll.question) {
            const messageId = query.message!.message_id;
            const selectedOption = Number(query.data);
            ReminderEditMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${numberToTime(selectedOption)}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            const { id, content, frequency, time } = await ReminderEditMemory.build(chatId);
            const isValid = () => Reminder.findOne({
                where: { id: id },
            }).then(reminder => reminder !== null);
            const job = () => bot.sendMessage(chatId, content);
            setReminder({
                number: time,
                frequency: frequency,
                job: job,
                isValid: isValid,
            });

            const [type, changed] = ReminderEditMemory.getReminder(chatId);
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have changed the ${type} of the reminder to ${changed}`);
        }
    },
};

const reminderEditWeeklyHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_WEEKLY
                && query.message!.text === weeklyPoll.question) {
            const messageId = query.message!.message_id;
            const selectedOption = Number(query.data);
            ReminderEditMemory.setTime(chatId, selectedOption);

            bot.editMessageText(
                `You selected: ${numberToTime(selectedOption)}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );

            const { id, content, frequency, time } = await ReminderEditMemory.build(chatId);
            const isValid = () => Reminder.findOne({
                where: { id: id },
            }).then(reminder => reminder !== null);
            const job = () => bot.sendMessage(chatId, content);
            setReminder({
                number: time,
                frequency: frequency,
                job: job,
                isValid: isValid,
            });

            const [type, changed] = ReminderEditMemory.getReminder(chatId);
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have changed the ${type} of the reminder to ${changed}`);
        }
    },
};

const reminderEditOnceHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_EDIT_ONCE) {
            const date = parseDateTime(msg.text!);
            if (!date || isNaN(date.getTime())) {
                bot.sendMessage(chatId, "Oops, I do not understand your datetime.");
                return;
            }
            if (date < new Date()) {
                bot.sendMessage(chatId, "Oops, you cannot send reminder for something in the past.");
                return;
            }
            if (date > new Date(2030, 11, 31)) {
                bot.sendMessage(chatId, "Oops, you cannot send reminder for something beyond the year of 2030.");
                return;
            }
            ReminderEditMemory.setTime(chatId, date.getTime() / 1000);

            const { id, content, frequency, time } = await ReminderEditMemory.build(chatId);
            const isValid = () => Reminder.findOne({
                where: { id: id },
            }).then(reminder => reminder !== null);
            const job = () => bot.sendMessage(chatId, content);
            setReminder({
                number: time,
                frequency: frequency,
                job: job,
                isValid: isValid,
            });

            const [type, changed] = ReminderEditMemory.getReminder(chatId);
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
            bot.sendMessage(chatId, `Alright, I have changed the ${type} of the reminder to ${changed}`);
        }
    },
};

const reminderDeleteIndexHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.REMINDER_DELETE) {
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
