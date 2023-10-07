import TelegramBot, { CallbackQuery, InlineKeyboardButton, Message } from "node-telegram-bot-api";

export type TextHandler = {
    command: RegExp,
    handler: (bot: TelegramBot) => (msg: Message) => void,
}

export type PlainHandler = {
    handler: (bot: TelegramBot) => (msg: Message) => void,
}

export type PollAnswerHandler = {
    handler: (bot: TelegramBot) => (query: CallbackQuery) => void,
}

export type PollType = {
    question: string,
    options: InlineKeyboardButton[][],
};
