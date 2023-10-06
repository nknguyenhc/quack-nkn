import TelegramBot, { Message } from "node-telegram-bot-api";

export type TextHandler = {
    command: RegExp,
    handler: (bot: TelegramBot) => (msg: Message) => void,
}
