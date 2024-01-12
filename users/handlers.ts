import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { User, getTimezone } from './db';
import { PlainHandler, PollAnswerHandler, TextHandler } from '../utils/types';
import UserStates from "../utils/states";
import { ReminderDeleteMemory, ReminderEditMemory, ReminderMemory } from "../reminder/temp";
import { TrackDeleteMemory, TrackEditMemory, TrackMemory } from "../tracker/temp";
import { timezonePoll } from './data';
import { TimezoneTemp, UserManager } from './temp';
import Logger from "../logging/logger";

const startHandler: TextHandler = {
    command: /^\/start$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId: number = msg.chat.id;
        Logger.getInfoLogger().commandLog(chatId, "/start");
        const users = await User.findAll({
            where: {
                chatId: String(chatId),
            }
        });
        if (users.length > 0) {
            Logger.getInfoLogger().log(`User ${chatId} is an old user.`);
            const user = users[0];
            user.update({
                username: msg.chat.username,
                firstname: msg.chat.first_name,
                lastname: msg.chat.last_name,
            });
        } else {
            Logger.getInfoLogger().log(`User ${chatId} is a new user.`);
            User.create({
                chatId: String(chatId),
                username: msg.chat.username,
                firstname: msg.chat.first_name,
                lastname: msg.chat.last_name,
            });
        }
        bot.sendMessage(chatId, 
            'Hello! Welcome to quack-nkn!\n'
            + 'This bot helps you set reminders for yourself and track websites\n'
            + 'My boss is Nguyen, you can find out more about him here: https://nknguyenhc.github.io/ \n'
            + 'Your timezone is defaulted to GMT+8. If this is not your timezone, reminder to change your timezone before using my services!\n'
            + 'If you wish to give feedback on my services, '
            + 'you can post an issue on my Github issue tracker here: https://github.com/nknguyenhc/quack-nkn/issues , '
            + 'or submit feedback to me at https://nknguyenhc.alwaysdata.net/\n'
            + 'Warning: using me to visit harmful websites will not be tolerated. '
            + 'You can read more about my terms of services here: https://nknguyenhc.alwaysdata.net/terms-of-services\n'
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
            Logger.getInfoLogger().commandLog(chatId, "/timezone");
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
            Logger.getInfoLogger().pollAnswerLog(chatId, query.data);
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
            Logger.getInfoLogger().messageLog(chatId, msg.text);
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
        Logger.getInfoLogger().commandLog(chatId, "/cancel");

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
            Logger.getInfoLogger().commandLog(chatId, "/add");
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
            Logger.getInfoLogger().commandLog(chatId, "/list");
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
            Logger.getInfoLogger().commandLog(chatId, "/edit");
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
            Logger.getInfoLogger().commandLog(chatId, "/delete");
            UserStates.setUserState(chatId, UserStates.STATE.DELETE);
            bot.sendMessage(chatId, 'What do you wish to delete?'
                    + '\n/reminder - delete one of your reminders'
                    + '\n/track - delete one of your website trackers');
        }
    }
};

const blockHandler: TextHandler = {
    command: /^\/ban/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserManager.isAdmin(chatId)) {
            Logger.getInfoLogger().commandLog(chatId, msg.text);
            const textBlocks = msg.text.split(' ');
            if (textBlocks.length === 1) {
                bot.sendMessage(chatId, 'Invalid command usage.');
                return;
            }
            
            const targetChatId = Number(textBlocks[1]);
            if (isNaN(targetChatId)) {
                bot.sendMessage(chatId, 'Invalid command usage.');
                return;
            }

            if (!await UserManager.isUserExist(targetChatId)) {
                bot.sendMessage(chatId, 'User not found.');
                return;
            }

            await UserManager.blockUser(targetChatId);
            bot.sendMessage(chatId, 'User blocked.');
        }
    },
};

const unblockHandler: TextHandler = {
    command: /^\/unban/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserManager.isAdmin(chatId)) {
            Logger.getInfoLogger().commandLog(chatId, msg.text);
            const textBlocks = msg.text.split(' ');
            if (textBlocks.length === 1) {
                bot.sendMessage(chatId, 'Invalid command usage.');
                return;
            }

            const targetChatId = Number(textBlocks[1]);
            if (isNaN(targetChatId)) {
                bot.sendMessage(chatId, 'Invalid command usage.');
                return;
            }

            if (!await UserManager.isUserExist(targetChatId)) {
                bot.sendMessage(chatId, 'User not found.');
                return;
            }

            await UserManager.unblockUser(targetChatId);
            bot.sendMessage(chatId, 'User unblocked.');
        }
    },
};

export const textUserHandlers: Array<TextHandler> = [
    startHandler,
    setTimezoneHandler,
    cancelHandler,
    addHandler,
    listHandler,
    editHandler,
    deleteHandler,
    blockHandler,
    unblockHandler,
];

export const plainUserHandlers: Array<PlainHandler> = [
    timezoneConfirmHandler,
];

export const pollUserHandlers: Array<PollAnswerHandler> = [
    timezoneHandler,
];
