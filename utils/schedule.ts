import Logger from "../logging/logger";

export type FrequencyType = 'daily' | 'weekly' | 'once';

export const setReminder = ({ number, frequency, job, isValid, timezone }: {
    number: number,
    frequency: FrequencyType,
    job: () => Promise<void>,
    isValid: () => Promise<boolean>,
    timezone: number,
}): void => {
    switch (frequency) {
        case 'daily':
            scheduleJob(getNearestTime(number, timezone), async () => {
                if (await isValid()) {
                    try {
                        await job();
                    } catch (e) {
                        Logger.getWarningLogger().log(`Failed to execute scheduled job, { number: ${number}, frequency: ${frequency}, timezone: ${timezone} }`);
                        Logger.getDebugLogger().log(e);
                    }
                    setReminder({ number, frequency, job, isValid, timezone });
                }
            });
            break;
        case 'weekly':
            scheduleJob(getNearestDateTime(Math.floor(number / 4), number % 4, timezone), async () => {
                if (await isValid()) {
                    try {
                        await job();
                    } catch (e) {
                        Logger.getWarningLogger().log(`Failed to execute scheduled job, { number: ${number}, frequency: ${frequency}, timezone: ${timezone} }`);
                        Logger.getDebugLogger().log(e);
                    }
                    setReminder({ number, frequency, job, isValid, timezone });
                }
            });
            break;
        case 'once':
            scheduleJob(new Date(number * 1000), async () => {
                if (await isValid()) {
                    try {
                        await job();
                    } catch (e) {
                        Logger.getWarningLogger().log(`Failed to execute scheduled job, { number: ${number}, frequency: ${frequency}, timezone: ${timezone} }`);
                        Logger.getDebugLogger().log(e);
                    }
                }
            });
            break;
    }
};

const scheduleJob = (time: Date, job: () => void) => {
    Logger.getDebugLogger().log(`Scheduling a job at time ${time}`);
    const timeDifference = time.getTime() - new Date().getTime();
    if (timeDifference <= 0) {
        return;
    }
    
    const maxDifference = 2e9;
    if (timeDifference < maxDifference) {
        setTimeout(job, timeDifference);
    } else {
        setTimeout(() => {
            scheduleJob(new Date(time.getTime() - maxDifference), job);
        }, maxDifference);
    }
}

const getNearestTime = (number: number, timezone: number): Date => {
    const now = new Date(new Date().getTime() + timezone * 3600 * 1000);
    if (now.getUTCHours() < number) {
        return new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            number - timezone,
        ));
    } else {
        return new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            number - timezone,
        ));
    }
}

const getNearestDateTime = (weekday: number, timeIndex: number, timezone: number): Date => {
    const now = new Date(new Date().getTime() + timezone * 3600 * 1000);
    const hour = timeIndex === 0
        ? 6
        : timeIndex === 1
        ? 12
        : timeIndex === 2
        ? 18
        : 22;
    if (now.getUTCDay() - 1 < weekday || (now.getUTCDay() - 1 === weekday && now.getUTCHours() < hour)) {
        return new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + (weekday - now.getUTCDay() + 1),
            hour - timezone,
        ));
    } else {
        return new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 7 + (weekday - now.getUTCDay() + 1),
            hour - timezone,
        ));
    }
}
