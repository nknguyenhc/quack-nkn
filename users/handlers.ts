import TelegramBot, { Message } from "node-telegram-bot-api";
import { User } from './db';
import { PlainHandler, TextHandler } from '../utils/types';
import UserStates, { knownCommands } from "../utils/states";

const startHandler: TextHandler = {
    command: /^\/start$/,
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId: number = msg.chat.id;
        await User.findOrCreate({
            where: {
                chatId: String(chatId),
                username: msg.chat.username,
            },
        });
        bot.sendMessage(chatId, 
            'Hello! Welcome to quack-nkn!\n'
            + 'This bot helps you set reminders for yourself and track websites (coming soon)\n'
            + 'My boss is Nguyen, you can find out more about him here: https://nknguyenhc.github.io/ \n'
            + 'Here is the list of available commands:\n'
            + '/start - show this message\n'
            + '/reminder - add, view, edit or delete your reminders\n'
            + '/cancel - at anytime when you wish to cancel what you are doing, you may use this command');
    }
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
        bot.sendMessage(chatId, "Operation cancelled.");
    }
};

const errorHandler: PlainHandler = {
    handler: (bot: TelegramBot) => async (msg: Message) => {
        const chatId = msg.chat.id;
        const stateInfo = knownCommands.get(UserStates.getUserState(chatId));
        if (!stateInfo.commands.some(regex => msg.text.match(regex))
                && (!stateInfo.allowPlain || msg.text.startsWith("/"))) {
            bot.sendMessage(chatId, stateInfo.errorMessage);
        }
    }
};

export const textUserHandlers: Array<TextHandler> = [
    startHandler,
    cancelHandler,
];

export const plainUserHandlers: Array<PlainHandler> = [
    errorHandler,
];
