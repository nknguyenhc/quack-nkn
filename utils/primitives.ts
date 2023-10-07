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
