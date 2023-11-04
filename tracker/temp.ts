import { Model } from "sequelize";
import { getRandomString, numberToTimeString } from "../utils/primitives";
import { FrequencyType } from "../utils/schedule";
import { Tracker, TrackerType } from './db';

type TrackType = {
    link?: string,
    selector?: string,
    caption?: string,
    selectorCount?: number,
    index?: number,
    pixelCount?: number,
    frequency?: FrequencyType,
    time?: number,
}

type TrackDict = {
    [key: number]: TrackType,
}

export class TrackMemory {
    static #tracks: TrackDict = {};

    static addUser(chatId: number) {
        TrackMemory.#tracks[chatId] = {};
    }

    static setLink(chatId: number, link: string) {
        TrackMemory.#tracks[chatId].link = link;
    }

    static getLink(chatId: number): string {
        return TrackMemory.#tracks[chatId].link!;
    }

    static setSelector(chatId: number, selector: string) {
        TrackMemory.#tracks[chatId].selector = selector;
    }

    static getSelector(chatId: number): string {
        return TrackMemory.#tracks[chatId].selector!;
    }

    static setSelectorCount(chatId: number, selectorCount: number) {
        TrackMemory.#tracks[chatId].selectorCount = selectorCount;
    }

    static getSelectorCount(chatId: number): number {
        return TrackMemory.#tracks[chatId].selectorCount!;
    }

    static setPixelCount(chatId: number, pixelCount: number) {
        TrackMemory.#tracks[chatId].pixelCount = pixelCount;
    }

    static setIndex(chatId: number, index: number) {
        TrackMemory.#tracks[chatId].index = index;
    }

    static setCaption(chatId: number, caption: string) {
        TrackMemory.#tracks[chatId].caption = caption;
    }

    static setFrequency(chatId: number, frequency: FrequencyType) {
        TrackMemory.#tracks[chatId].frequency = frequency;
    }

    static setTime(chatId: number, time: number) {
        TrackMemory.#tracks[chatId].time = time;
    }

    static getTracker(chatId: number): string {
        const { link, caption, time, frequency } = TrackMemory.#tracks[chatId];
        const result: string = `\`${link}\` ${numberToTimeString(time, frequency)} with caption "${caption}"`;
        delete TrackMemory.#tracks[chatId];
        return result;
    }

    static async build(chatId: number): Promise<{
        id: string,
        link: string,
        selector: string,
        index?: number,
        caption: string,
    }> {
        const id = getRandomString();
        const { link, selector, index, caption, pixelCount, frequency, time } = TrackMemory.#tracks[chatId];
        await Tracker.create({
            id: id,
            address: link,
            selector: selector ? selector : String(pixelCount),
            selectorIndex: index,
            caption: caption,
            frequency: frequency,
            time: time,
            userChatId: String(chatId),
        });
        return {
            id,
            link,
            selector: selector ? selector: String(pixelCount),
            index,
            caption,
        };
    }

    static deleteUser(chatId: number) {
        delete TrackMemory.#tracks[chatId];
    }
}

type TrackerInfo = {
    id: string,
    link: string,
}

type TrackEditType = {
    trackers?: Array<TrackerInfo>,
    trackerIndex?: number,
    link?: string,
    selector?: string,
    selectorCount?: number,
    index?: number,
    pixelCount?: number,
    caption?: string,
    frequency?: FrequencyType,
    time?: number,
}

type EditDict = {
    [key: number]: TrackEditType,
}

export class TrackEditMemory {
    static #trackers: EditDict = {};

    static setUser(chatId: number, trackers: Array<TrackerInfo>) {
        TrackEditMemory.#trackers[chatId] = {
            trackers,
        };
    }

    static setTrackerIndex(chatId: number, trackerIndex: number): boolean {
        if (isNaN(trackerIndex) || trackerIndex > TrackEditMemory.#trackers[chatId].trackers.length || trackerIndex <= 0) {
            return false;
        }
        TrackEditMemory.#trackers[chatId].trackerIndex = trackerIndex - 1;
        return true;
    }

    static setLink(chatId: number, link: string) {
        TrackEditMemory.#trackers[chatId].link = link;
    }

    static getLink(chatId: number): string {
        const { link, trackers, trackerIndex } = TrackEditMemory.#trackers[chatId];
        return link ? link : trackers[trackerIndex].link;
    }

    static setSelector(chatId: number, selector: string) {
        TrackEditMemory.#trackers[chatId].selector = selector;
    }

    static getSelector(chatId: number): string {
        return TrackEditMemory.#trackers[chatId].selector;
    }

    static setSelectorCount(chatId: number, selectorCount: number) {
        TrackEditMemory.#trackers[chatId].selectorCount = selectorCount;
    }

    static getSelectorCount(chatId: number): number {
        return TrackEditMemory.#trackers[chatId].selectorCount!;
    }

    static setIndex(chatId: number, index: number) {
        TrackEditMemory.#trackers[chatId].index = index;
    }

    static setPixelCount(chatId: number, pixelCount: number) {
        TrackEditMemory.#trackers[chatId].pixelCount = pixelCount;
    }

    static setCaption(chatId: number, caption: string) {
        TrackEditMemory.#trackers[chatId].caption = caption;
    }

    static setFrequency(chatId: number, frequency: FrequencyType) {
        TrackEditMemory.#trackers[chatId].frequency = frequency;
    }

    static setTime(chatId: number, time: number) {
        TrackEditMemory.#trackers[chatId].time = time;
    }

    static async build(chatId: number): Promise<Model<TrackerType, TrackerType>> {
        const {
            trackers,
            trackerIndex,
            link,
            selector,
            index,
            pixelCount,
            caption,
            frequency,
            time,
        } = TrackEditMemory.#trackers[chatId];
        const originalLink = trackers[trackerIndex];
        const newId = getRandomString();

        if (link) {
            await Tracker.update({
                id: newId,
                address: link,
                selector: selector ? selector : String(pixelCount),
                selectorIndex: index,
            }, {
                where: {
                    id: originalLink.id,
                },
            });
        } else if (selector) {
            await Tracker.update({
                id: newId,
                selector: selector ? selector : String(pixelCount),
                selectorIndex: index,
            }, {
                where: {
                    id: originalLink.id,
                },
            });
        } else if (caption) {
            await Tracker.update({
                id: newId,
                caption: caption,
            }, {
                where: {
                    id: originalLink.id,
                },
            });
        } else {
            await Tracker.update({
                id: newId,
                frequency: frequency,
                time: time,
            }, {
                where: {
                    id: originalLink.id,
                },
            });
        }

        delete TrackEditMemory.#trackers[chatId];
        return Tracker.findOne({
            where: { id: newId },
        });
    }

    static deleteUser(chatId: number) {
        delete TrackEditMemory.#trackers[chatId];
    }
}
