import { FrequencyType } from "./schedule";

export const formatNumber = (number: number, length: number) => {
    if (String(number).length >= length) {
        return String(number).slice(0, length);
    } else {
        return '0'.repeat(length - String(number).length) + String(number);
    }
}

export const formatDate = (date: Date) => {
    return `${
        formatNumber(date.getDate(), 2)
    }/${
        formatNumber(date.getMonth() + 1, 2)
    }/${
        formatNumber(date.getFullYear(), 4)
    } ${
        formatNumber(date.getHours(), 2)
    }:${
        formatNumber(date.getMinutes(), 2)
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

export const numberToTimeString = (number: number, frequency: FrequencyType): string => {
    switch (frequency) {
        case 'daily':
            return `everyday ${numberToTime(number)}`;
        case 'weekly':
            return weeklyNumberToString(number);
        case 'once':
            return `at ${formatDate(new Date(number * 1000))}`;
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

export const parseDateTime = (str: string): Date | undefined => {
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
    return new Date(year, month - 1, day, hour, minute);
}

export const getRandomString = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}
