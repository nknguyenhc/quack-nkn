import { Reminder, ReminderType } from "./db";
import { numberToTimeString, parseDateTime } from "../utils/primitives";
import { Model } from "sequelize";
import TelegramBot, { CallbackQuery } from "node-telegram-bot-api";
import UserStates from "../utils/states";
import { FrequencyType, setReminder } from "../utils/schedule";
import { dailyPoll, onceQuestion, weeklyPoll } from "./data";
import { ReminderEditMemory, ReminderMemory } from "./temp";

const reminderDataToString = (reminder: Model<ReminderType, ReminderType>): string => {
    return `${
        reminder.dataValues.content
    } (${
        reminder.dataValues.frequency
    }) ${
        numberToTimeString(reminder.dataValues.time, reminder.dataValues.frequency)
    }`;
};

export const listingAllReminders = async ({
    bot,
    chatId,
    tempSetter,
    lastNote,
}: {
    bot: TelegramBot, 
    chatId: number, 
    tempSetter?: (allReminders: Array<Model<ReminderType, ReminderType>>) => void,
    lastNote?: string,
}): Promise<boolean> => {
    const allReminders = await Reminder.findAll({
        where: {
            userChatId: String(chatId),
        },
    });
    tempSetter && tempSetter(allReminders);
    if (allReminders.length === 0) {
        bot.sendMessage(chatId, "You have no reminders yet.");
        UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        return false;
    }

    let message = 'Alright, here is your list of reminders:';
    allReminders.forEach((reminder, reminderIndex) => {
        message += `\n${reminderIndex + 1}. ${reminderDataToString(reminder)}`;
    });
    lastNote && (message += "\n" + lastNote);
    bot.sendMessage(chatId, message);
    return true;
};

export const recordFrequency = ({
    bot,
    chatId,
    query,
    tempSetter,
    setDailyState,
    setWeeklyState,
    setOnceState,
}: {
    bot: TelegramBot,
    chatId: number,
    query: CallbackQuery,
    tempSetter: (chatId: number, selectedOption: FrequencyType) => void,
    setDailyState: () => void,
    setWeeklyState: () => void,
    setOnceState: () => void,
}): void => {
    const messageId: number = query.message!.message_id;
    const selectedOption: FrequencyType = query.data as FrequencyType;
    tempSetter(chatId, selectedOption);

    bot.editMessageText(
        `Alright, I will set reminder ${selectedOption}.`,
        {
            chat_id: chatId,
            message_id: messageId,
        },
    );
    sendTimeQuestion({
        bot: bot,
        chatId: chatId,
        frequency: selectedOption,
        setDailyState: setDailyState,
        setWeeklyState: setWeeklyState,
        setOnceState: setOnceState,
    });
};

export const sendTimeQuestion = ({
    bot,
    chatId,
    frequency,
    setDailyState,
    setWeeklyState,
    setOnceState,
}: {
    bot: TelegramBot,
    chatId: number,
    frequency: FrequencyType,
    setDailyState: () => void,
    setWeeklyState: () => void,
    setOnceState: () => void,
}) => {
    switch (frequency) {
        case 'daily':
            setTimeout(setDailyState, 100);
            bot.sendMessage(chatId, dailyPoll.question, {
                reply_markup: {
                    inline_keyboard: dailyPoll.options,
                },
            }).then(msg => {
                UserStates.setUserQuestionId(chatId, msg.message_id);
            });
            break;
        case 'weekly':
            setTimeout(setWeeklyState, 100);
            bot.sendMessage(chatId, weeklyPoll.question, {
                reply_markup: {
                    inline_keyboard: weeklyPoll.options,
                },
            }).then(msg => {
                UserStates.setUserQuestionId(chatId, msg.message_id);
            });
            break;
        case 'once':
            setTimeout(setOnceState, 100);
            bot.sendMessage(chatId, onceQuestion).then(msg => {
                UserStates.setUserQuestionId(chatId, msg.message_id);
            });
            break;
    }
}

export const addReminder = ({
    query,
    editedText,
    bot,
    chatId,
    frequency,
}:{
    query: CallbackQuery, 
    editedText: (selectedOption: number) => string, 
    bot: TelegramBot, 
    chatId: number, 
    frequency: FrequencyType
}) => {
    const messageId: number = query.message!.message_id;
    const selectedOption = Number(query.data);
    bot.editMessageText(
        editedText(selectedOption),
        {
            chat_id: chatId,
            message_id: messageId,
        },
    );
    addReminderWithNumber({
        number: selectedOption,
        bot: bot,
        chatId: chatId,
        frequency: frequency,
    });
};

export const addReminderWithNumber = async ({
    number,
    bot,
    chatId,
    frequency,
}: {
    number: number,
    bot: TelegramBot,
    chatId: number,
    frequency: FrequencyType,
}) => {
    ReminderMemory.setTime(chatId, number);
    const id = await ReminderMemory.build(chatId);
    const message = ReminderMemory.getMessage(chatId);
    const isValid = () => Reminder.findOne({
        where: {
            id: id,
        }
    }).then(reminder => reminder !== null);
    const job = () => bot.sendMessage(chatId, message);
    setReminder({
        number: number,
        frequency: frequency,
        job: job,
        isValid: isValid,
    });

    UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
    bot.sendMessage(chatId, `Alright, I have set reminder for ${ReminderMemory.getReminder(chatId)}.`);
};

export const editReminder = ({
    query,
    editedText,
    bot,
    chatId,
    frequency,
}: {
    query: CallbackQuery,
    editedText: (selectedOption: number) => string,
    bot: TelegramBot,
    chatId: number,
    frequency: FrequencyType,
}) => {
    const messageId = query.message!.message_id;
    const selectedOption = Number(query.data);
    bot.editMessageText(
        editedText(selectedOption),
        {
            chat_id: chatId,
            message_id: messageId,
        },
    );
    ReminderEditMemory.setTime(chatId, selectedOption);
    editReminderWithNumber({
        bot: bot,
        chatId: chatId,
    });
};

export const editReminderWithNumber = async ({
    bot,
    chatId,
}: {
    bot: TelegramBot,
    chatId: number,
}) => {
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
};

export const checkDateString = ({
    string,
    bot,
    chatId,
}: {
    string: string,
    bot: TelegramBot,
    chatId: number,
}): Date | undefined => {
    const date = parseDateTime(string);
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
    return date;
};
