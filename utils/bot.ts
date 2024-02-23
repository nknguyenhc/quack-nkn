import { unlink } from "fs";
import TelegramBot from "node-telegram-bot-api"
import Logger from "../logging/logger";

export const sendPhoto = async ({
    bot,
    filename,
    chatId,
    caption,
}: {
    bot: TelegramBot,
    filename: string,
    chatId: number,
    caption: string,
}): Promise<void> => {
    await bot.sendPhoto(chatId, 'media/' + filename + '.jpg', {
        caption: caption,
    }, {
        contentType: 'image/jpeg',
    }).then(() => {
        unlink('media/' + filename + '.jpg', (err) => {
            if (err) {
                Logger.getWarningLogger().log(`Failed to delete ${filename}.jpg, encountered the following error: ${err.message}`);
                Logger.getDebugLogger().log(`Stacktrace: ${err.stack}`);
            }
        });
    });
};
