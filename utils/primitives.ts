import { FrequencyType } from "./schedule";

export const formatNumber = (number: number, length: number) => {
    if (String(number).length >= length) {
        return String(number).slice(0, length);
    } else {
        return '0'.repeat(length - String(number).length) + String(number);
    }
}

const formatDate = (date: Date, timezone: number) => {
    const now = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours() + timezone, date.getUTCMinutes()));
    return `${
        formatNumber(now.getUTCDate(), 2)
    }/${
        formatNumber(now.getUTCMonth() + 1, 2)
    }/${
        formatNumber(now.getUTCFullYear(), 4)
    } ${
        formatNumber(now.getUTCHours(), 2)
    }:${
        formatNumber(now.getUTCMinutes(), 2)
    }`
}

export const numberToTime = (number: number): string => {
    if (number < 12) {
        return `${number} AM`;
    } else if (number === 12) {
        return '12 PM';
    } else {
        return `${number - 12} PM`;
    }
}

export const numberToTimeString = (number: number, frequency: FrequencyType, timezone: number): string => {
    switch (frequency) {
        case 'daily':
            return `everyday ${numberToTime(number)}`;
        case 'weekly':
            return weeklyNumberToString(number);
        case 'once':
            return `at ${formatDate(new Date(number * 1000), timezone)}`;
    }
}

export const weeklyNumberToString = (number: number): string => {
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

export const timeDailyDelta = (time: number, delta: number): number => (time + delta + 24) % 24;

export const timeWeeklyDelta = (time: number, delta: number): number => {
    let currTime = Math.floor(time / 4) * 24;
    switch (time % 4) {
        case 0:
            currTime += 6;
            break;
        case 1:
            currTime += 12;
            break;
        case 2:
            currTime += 18;
            break;
        case 3:
            currTime += 22;
            break;
    }

    let newTime = (currTime + delta + 24 * 7) % (24 * 7);
    const newDay = Math.floor(newTime / 24);
    let newHour = newTime % 24;
    if (0 <= newHour && newHour <= 1) {
        newHour = -1;
    } else if (2 <= newHour && newHour <= 8) {
        newHour = 0;
    } else if (9 <= newHour && newHour <= 14) {
        newHour = 1;
    } else if (15 <= newHour && newHour <= 19) {
        newHour = 2;
    } else {
        newHour = 3;
    }

    newTime = (newDay * 4 + newHour + 28) % 28;
    return newTime;
};

export const timeOnceDelta = (time: number, delta: number): number => time + delta * 3600;

export const parseDateTime = (str: string, timezone: number): Date | undefined => {
    const splitBySpace = str.split(' ');
    if (splitBySpace.length !== 2) {
        return undefined;
    }

    const [dateString, timeString] = splitBySpace;
    const dateStringSplitBySlash = dateString.split('/');
    if (dateStringSplitBySlash.length !== 3) {
        return undefined;
    }
    const timeStringSplitByColon = timeString.split(':');
    if (timeStringSplitByColon.length !== 2) {
        return undefined;
    }

    const [day, month, year] = dateStringSplitBySlash.map(e => Number(e));
    const [hour, minute] = timeStringSplitByColon.map(e => Number(e));
    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute)) {
        return undefined;
    }
    return new Date(Date.UTC(year, month - 1, day, hour - timezone, minute));
}

export const getRandomString = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

export const sleep = async (time: number) => await new Promise(resolve => setTimeout(resolve, time * 1000));
