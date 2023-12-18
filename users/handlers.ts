import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { User, getTimezone } from './db';
import { PlainHandler, PollAnswerHandler, TextHandler } from '../utils/types';
import UserStates, { knownCommands } from "../utils/states";
import { ReminderDeleteMemory, ReminderEditMemory, ReminderMemory } from "../reminder/temp";
import { TrackDeleteMemory, TrackEditMemory, TrackMemory } from "../tracker/temp";
import { timezonePoll } from './data';
import { TimezoneTemp } from './temp';

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
        } else {
            User.create({
                chatId: String(chatId),
                username: msg.chat.username,
            });
        }
        bot.sendMessage(chatId, 
            'Hello! Welcome to quack-nkn!\n'
            + 'This bot helps you set reminders for yourself and track websites\n'
            + 'My boss is Nguyen, you can find out more about him here: https://nknguyenhc.github.io/ \n'
            + 'Your timezone is defaulted to GMT+8. If this is not your timezone, reminder to change your timezone before using my services!\n'
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

            const timezone = await getTimezone(chatId);
            TimezoneTemp.setCurrTimezone(chatId, timezone);

            bot.sendMessage(chatId, `Your current timezone is currently set to GMT${timezone >= 0 ? "+" + timezone : timezone}. ` + timezonePoll.question, {
                reply_markup: {
                    inline_keyboard: timezonePoll.options,
                },
            }).then(msg => {
                UserStates.setUserQuestionId(chatId, msg.message_id);
            });
        }
    }
};

const timezoneHandler: PollAnswerHandler = {
    handler: (bot: TelegramBot) => async (query: CallbackQuery) => {
        const chatId = query.message!.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TIMEZONE) {
            const messageId = query.message!.message_id;
            const selectedOption = Number(query.data);

            UserStates.setUserState(chatId, UserStates.STATE.TIMEZONE_CONFIRM);
            TimezoneTemp.setFinalTimezone(chatId, selectedOption);

            bot.editMessageText(
                `Alright, I will set your timezone to GMT${selectedOption >= 0 ? "+" + selectedOption : selectedOption}. `
                    + 'Would you like to change your reminder and tracker timing according to your change in timezone?\n'
                    + 'For example, if you say \"yes\", if you changed your timezone from GMT+7 to GMT+8, '
                    + 'a reminder scheduled at 3PM will now be delivered at 4PM (in your local time); '
                    + 'if you say \"no\", it will still be delivered at 3PM (in your local time).',
                {
                    chat_id: chatId,
                    message_id: messageId,
                },
            );
        }
    }
};

const timezoneConfirmHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserStates.getUserState(chatId) === UserStates.STATE.TIMEZONE_CONFIRM) {
            const response = msg.text!.toLowerCase().trim();
            if (response === 'yes' || response === 'y') {
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.NORMAL), 100);
                await TimezoneTemp.buildChange(chatId);
                bot.sendMessage(chatId, "Ok, I have changed reminder and tracker timings according to your change in timezone.");
            } else if (response === 'no' || response === 'n') {
                setTimeout(() => UserStates.setUserState(chatId, UserStates.STATE.NORMAL), 100);
                await TimezoneTemp.buildNoChange(chatId, bot);
                bot.sendMessage(chatId, "Ok, I have kept your reminder and tracker timings as they are.");
            } else {
                bot.sendMessage(chatId, "Please confirm with either \"yes\" or \"no\"");
            }
        }
    },
};

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
        TimezoneTemp.cancel(chatId);
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
    timezoneConfirmHandler,
];

export const pollUserHandlers: Array<PollAnswerHandler> = [
    timezoneHandler,
];
