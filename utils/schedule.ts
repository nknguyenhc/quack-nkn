export type FrequencyType = 'daily' | 'weekly' | 'once';

export const setReminder = ({ number, frequency, job, isValid, timezone }: {
    number: number,
    frequency: FrequencyType,
    job: () => void,
    isValid: () => Promise<boolean>,
    timezone: number,
}): void => {
    switch (frequency) {
        case 'daily':
            scheduleJob(getNearestTime(number, timezone), async () => {
                if (await isValid()) {
                    job();
                    setReminder({ number, frequency, job, isValid, timezone });
                }
            });
            break;
        case 'weekly':
            scheduleJob(getNearestDateTime(Math.floor(number / 4), number % 4, timezone), async () => {
                if (await isValid()) {
                    job();
                    setReminder({ number, frequency, job, isValid, timezone });
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

const scheduleJob = (time: Date, job: () => void) => {
    if (time.getTime() - new Date().getTime() > 0) {
        setTimeout(job, time.getTime() - new Date().getTime());
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
