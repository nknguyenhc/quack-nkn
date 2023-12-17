import { Reminder, ReminderType } from "./db";
import { getRandomString, numberToTimeString } from '../utils/primitives';
import { FrequencyType } from "../utils/schedule";

type ReminderTemp = {
    content?: string,
    frequency?: FrequencyType,
    time?: number,
};

type Dict = {
    [key: number]: ReminderTemp,
}

export class ReminderMemory {
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

    static getReminder(chatId: number, timezone: number): string {
        const result: string = `"${ReminderMemory.#reminders[chatId].content}" ${
            numberToTimeString(
                ReminderMemory.#reminders[chatId].time,
                ReminderMemory.#reminders[chatId].frequency,
                timezone,
            )}`;
        delete ReminderMemory.#reminders[chatId];
        return result;
    }

    static deleteMemory(chatId: number) {
        delete ReminderMemory.#reminders[chatId];
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

type EditTemp = {
    reminders?: Array<string>,
    index?: number,
    content?: string,
    frequency?: FrequencyType,
    time?: number,
}

type EditDict = {
    [key: number]: EditTemp,
}

export class ReminderEditMemory {
    static #reminders: EditDict = {};

    static setUser(chatId: number, reminders: Array<string>) {
        ReminderEditMemory.#reminders[chatId] = {
            reminders,
        };
    }

    static setIndex(chatId: number, index: number): boolean {
        if (isNaN(index) || index > ReminderEditMemory.#reminders[chatId].reminders.length || index <= 0) {
            return false;
        }
        ReminderEditMemory.#reminders[chatId].index = index - 1;
        return true;
    }

    static setContent(chatId: number, content: string) {
        ReminderEditMemory.#reminders[chatId].content = content;
    }

    static setFrequency(chatId: number, frequency: FrequencyType) {
        ReminderEditMemory.#reminders[chatId].frequency = frequency;
    }

    static setTime(chatId: number, time: number) {
        ReminderEditMemory.#reminders[chatId].time = time;
    }

    static async autoSetFrequency(chatId: number) {
        const { reminders, index } = ReminderEditMemory.#reminders[chatId];
        const changedFrequency = ReminderEditMemory.#reminders[chatId].frequency;
        if (!changedFrequency) {
            const frequency = (await Reminder.findOne({
                where: { id: reminders[index] },
            })).dataValues.frequency;
            ReminderEditMemory.#reminders[chatId].frequency = frequency;
            return frequency;
        }
        return changedFrequency;
    }

    static async build(chatId: number): Promise<ReminderType> {
        const { reminders, index, content, frequency, time } = ReminderEditMemory.#reminders[chatId];
        const id = reminders[index];
        const newId = getRandomString();
        if (content) {
            await Reminder.update({ content, id: newId }, {
                where: { id: id },
            });
        } else {
            await Reminder.update({ frequency, time, id: newId }, {
                where: { id: id },
            });
        }
        return (await Reminder.findOne({
            where: { id: newId }
        })).dataValues;
    }

    static getReminder(chatId: number, timezone: number): [string, string] {
        const { content, frequency, time } = ReminderEditMemory.#reminders[chatId];
        delete ReminderEditMemory.#reminders[chatId];
        if (content) {
            return ["content", "\"" + content + "\""];
        }
        if (frequency) {
            return ["frequency", numberToTimeString(time, frequency, timezone)];
        }
        if (time) {
            return ["time", numberToTimeString(time, frequency, timezone)];
        }
    }

    static deleteMemory(chatId: number) {
        delete ReminderEditMemory.#reminders[chatId];
    }
}

type RemoveTemp = {
    reminders: Array<string>,
}

type RemoveDict = {
    [key: number]: RemoveTemp,
}

export class ReminderDeleteMemory {
    static #reminders: RemoveDict = {};

    static setUser(chatId: number, reminders: Array<string>) {
        ReminderDeleteMemory.#reminders[chatId] = { reminders };
    }

    static async deleteReminder(chatId: number, index: number) {
        const { reminders } = ReminderDeleteMemory.#reminders[chatId];
        if (!isNaN(index) && index > 0 && index <= reminders.length) {
            await Reminder.destroy({
                where: {
                    userChatId: String(chatId),
                    id: reminders[index - 1],
                },
            });
            delete ReminderDeleteMemory.#reminders[chatId];
            return true;
        }
        return false;
    }

    static getReminderCount(chatId: number): number {
        return ReminderDeleteMemory.#reminders[chatId].reminders.length;
    }

    static deleteMemory(chatId: number) {
        delete ReminderDeleteMemory.#reminders[chatId];
    }
}
