import { scheduleJob } from "node-schedule";

export type FrequencyType = 'daily' | 'weekly' | 'once';

export const setReminder = ({ number, frequency, job, isValid }: {
    number: number,
    frequency: FrequencyType,
    job: () => void,
    isValid: () => Promise<boolean>,
}): void => {
    switch (frequency) {
        case 'daily':
            scheduleJob(getNearestTime(number), async () => {
                if (await isValid()) {
                    job();
                    setReminder({ number, frequency, job, isValid });
                }
            });
            break;
        case 'weekly':
            scheduleJob(getNearestDateTime(Math.floor(number / 4), number % 4), async () => {
                if (await isValid()) {
                    job();
                    setReminder({ number, frequency, job, isValid });
                }
            });
            break;
        case 'once':
            scheduleJob(new Date(number * 1000), async () => {
                if (await isValid()) {
                    job();
                }
            });
            break;
    }
};

const getNearestTime = (number: number): Date => {
    const now = new Date();
    if (now.getHours() < number) {
        return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            number,
        );
    } else {
        return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            number,
        );
    }
}

const getNearestDateTime = (weekday: number, timeIndex: number): Date => {
    const now = new Date();
    const hour = timeIndex === 0
        ? 6
        : timeIndex === 1
        ? 12
        : timeIndex === 2
        ? 18
        : 22;
    if (now.getDay() < weekday || (now.getDay() === weekday && now.getHours() < hour)) {
        return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hour,
        );
    } else {
        return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 7 - (now.getDay() - weekday),
            hour,
        );
    }
}
