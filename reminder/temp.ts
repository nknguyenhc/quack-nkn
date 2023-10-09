import { Reminder } from "./db";
import { formatDate, getRandomString, numberToTime } from '../utils/primitives';
import { FrequencyType } from "../utils/schedule";

type ReminderTemp = {
    content?: string,
    frequency?: FrequencyType,
    time?: number,
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

    static setTime(chatId: number, time: number) {
        ReminderMemory.#reminders[chatId].time = time;
    }

    static numberToTime(number: number, frequency: FrequencyType): string {
        switch (frequency) {
            case 'daily':
                return `everyday ${numberToTime(number)}`;
            case 'weekly':
                return ReminderMemory.weeklyNumberToString(number);
            case 'once':
                return `at ${formatDate(new Date(number * 1000))}`;
        }
    }

    static weeklyNumberToString(number: number): string {
        let dayString: string = '';
        let timeString: string = '';
        switch (Math.floor(number / 4)) {
            case 0:
                dayString = 'Mon';
                break;
            case 1:
                dayString = 'Tue';
                break;
            case 2:
                dayString = 'Wed';
                break;
            case 3:
                dayString = 'Thu';
                break;
            case 4:
                dayString = 'Fri';
                break;
            case 5:
                dayString = 'Sat';
                break;
            case 6:
                dayString = 'Sun';
                break;
        }
        switch (number % 4) {
            case 0:
                timeString = '6AM';
                break;
            case 1:
                timeString = '12PM';
                break;
            case 2:
                timeString = '6PM';
                break;
            case 3:
                timeString = '10PM';
                break;
        }
        return `every week ${dayString} ${timeString}`;
    }

    static getReminder(chatId: number): string {
        const result: string = `"${ReminderMemory.#reminders[chatId].content}" ${
            ReminderMemory.numberToTime(
                ReminderMemory.#reminders[chatId].time,
                ReminderMemory.#reminders[chatId].frequency,
            )}`;
        delete ReminderMemory.#reminders[chatId];
        return result;
    }

    static getMessage(chatId: number): string {
        return ReminderMemory.#reminders[chatId].content;
    }

    static async build(chatId: number): Promise<string> {
        const id = getRandomString();
        await Reminder.create({
            id: id,
            content: ReminderMemory.#reminders[chatId].content,
            frequency: ReminderMemory.#reminders[chatId].frequency,
            userChatId: String(chatId),
            time: ReminderMemory.#reminders[chatId].time,
        });
        return id;
    }
}

export default ReminderMemory;
