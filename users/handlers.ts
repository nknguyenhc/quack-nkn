import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { User } from './db';
import { PlainHandler, PollAnswerHandler, TextHandler } from '../utils/types';
import UserStates, { knownCommands } from "../utils/states";
import { ReminderDeleteMemory, ReminderEditMemory, ReminderMemory } from "../reminder/temp";
import { TrackDeleteMemory, TrackEditMemory, TrackMemory } from "../tracker/temp";
import { timezonePoll } from './data';

const startHandler: TextHandler = {
    command: /^\/start$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId: number = msg.chat.id;
        const users = await User.findAll({
            where: {
                chatId: String(chatId),
            }
        });
        if (users.length > 0) {
            const user = users[0];
            if (msg.chat.username && user.dataValues.username !== msg.chat.username) {
                user.update({
                    username: msg.chat.username,
                });
            }
        }
        bot.sendMessage(chatId, 
            'Hello! Welcome to quack-nkn!\n'
            + 'This bot helps you set reminders for yourself and track websites\n'
            + 'My boss is Nguyen, you can find out more about him here: https://nknguyenhc.github.io/ \n'
            + 'Here is the list of available commands:\n'
            + '/start - show this message\n'
            + '/reminder - add, view, edit or delete your reminders\n'
            + '/timezone - set your timezone\n'
            + '/track - add, view, edit or delete your website trackers\n'
            + '/cancel - at anytime when you wish to cancel what you are doing, you may use this command');
    }
};

const setTimezoneHandler: TextHandler = {
    command: /^\/timezone$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId: number = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.NORMAL) {
            UserStates.setUserState(chatId, UserStates.STATE.TIMEZONE);

            const timezone = (await User.findOne({
                where: {
                    chatId: String(chatId),
                },
            })).dataValues.timezone;

            bot.sendMessage(chatId, `Your current timezone is currently set to GMT${timezone >= 0 ? "+" + timezone : timezone}. ` + timezonePoll.question, {
                reply_markup: {
                    inline_keyboard: timezonePoll.options,
                },
            });
        }
    }
};

const timezoneHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TIMEZONE) {
            const messageId = query.message!.message_id;
            const selectedOption = Number(query.data);

            User.update({
                timezone: selectedOption,
            }, {
                where: {
                    chatId: String(chatId),
                },
            });
            UserStates.setUserState(chatId, UserStates.STATE.NORMAL);

            bot.editMessageText(
                `Alright, I have set your timezone to GMT${selectedOption >= 0 ? "+" + selectedOption : selectedOption}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );
        }
    }
}

const cancelHandler: TextHandler = {
    command: /^\/cancel$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;

        if (UserStates.getUserQuestionId(chatId)) {
            bot.editMessageText(
                'Cancelled',
                {
                    message_id: UserStates.getUserQuestionId(chatId),
                    chat_id: chatId,
                },
            );
        }

        UserStates.setUserQuestionId(chatId, 0);
        UserStates.setUserState(chatId, UserStates.STATE.NORMAL);
        ReminderMemory.deleteMemory(chatId);
        ReminderEditMemory.deleteMemory(chatId);
        ReminderDeleteMemory.deleteMemory(chatId);
        TrackMemory.deleteUser(chatId);
        TrackEditMemory.deleteUser(chatId);
        TrackDeleteMemory.deleteUser(chatId);
        bot.sendMessage(chatId, "Operation cancelled.");
    }
};

const addHandler: TextHandler = {
    command: /^\/add$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.NORMAL) {
            UserStates.setUserState(chatId, UserStates.STATE.ADD);
            bot.sendMessage(chatId, 'What do you wish to add?'
                    + '\n/reminder - add a new reminder'
                    + '\n/track - add a new website tracker');
        }
    },
};

const listHandler: TextHandler = {
    command: /^\/list$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.NORMAL) {
            UserStates.setUserState(chatId, UserStates.STATE.LIST);
            bot.sendMessage(chatId, 'What do you wish to view?'
                    + '\n/reminder - view your list of reminders'
                    + '\n/track - view your list of website trackers');
        }
    },
};

const editHandler: TextHandler = {
    command: /^\/edit$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.NORMAL) {
            UserStates.setUserState(chatId, UserStates.STATE.EDIT);
            bot.sendMessage(chatId, 'What do you wish to edit?'
                    + '\n/reminder - edit one of your reminders'
                    + '\n/track - edit one of your trackers');
        }
    }
}

const deleteHandler: TextHandler = {
    command: /^\/delete$/,
    handler: (bot: TelegramBot) => (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.NORMAL) {
            UserStates.setUserState(chatId, UserStates.STATE.DELETE);
            bot.sendMessage(chatId, 'What do you wish to delete?'
                    + '\n/reminder - delete one of your reminders'
                    + '\n/track - delete one of your website trackers');
        }
    }
}

const errorHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        const stateInfo = knownCommands.get(UserStates.getUserState(chatId))!;
        if (!stateInfo.commands.some(regex => msg.text?.match(regex))
                && (!stateInfo.allowPlain || msg.text?.startsWith("/"))) {
            bot.sendMessage(chatId, stateInfo.errorMessage);
        }
    }
};

export const textUserHandlers: Array<TextHandler> = [
    startHandler,
    setTimezoneHandler,
    cancelHandler,
    addHandler,
    listHandler,
    editHandler,
    deleteHandler,
];

export const plainUserHandlers: Array<PlainHandler> = [
    errorHandler,
];

export const pollUserHandlers: Array<PollAnswerHandler> = [
    timezoneHandler,
];
