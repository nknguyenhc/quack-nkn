import { FrequencyType, Reminder } from "./db";

type ReminderTemp = {
    content?: string,
    frequency?: FrequencyType,
};

type Dict = {
    [key: number]: ReminderTemp,
}

class ReminderMemory {
    static #reminders: Dict = {};

    static setUser(chatId: number) {
        ReminderMemory.#reminders[chatId] = {};
    }

    static setContent(chatId: number, content: string): void {
        ReminderMemory.#reminders[chatId].content = content;
    }

    static setFrequency(chatId: number, frequency: FrequencyType): void {
        ReminderMemory.#reminders[chatId].frequency = frequency;
    }

    static getReminder(chatId: number): string {
        return `"${ReminderMemory.#reminders[chatId].content}" ${ReminderMemory.#reminders[chatId].frequency}`;
    }

    static async build(chatId: number): Promise<void> {
        await Reminder.create({
            content: ReminderMemory.#reminders[chatId].content,
            frequency: ReminderMemory.#reminders[chatId].frequency,
            userChatId: chatId,
        });
    }
}

export default ReminderMemory;
