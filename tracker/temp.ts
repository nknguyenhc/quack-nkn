import { numberToTimeString } from "../utils/primitives";
import { FrequencyType } from "../utils/schedule";

type TrackType = {
    link?: string,
    selector?: string,
    caption?: string,
    selectorCount?: number,
    index?: number,
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

    static deleteUser(chatId: number) {
        delete TrackMemory.#tracks[chatId];
    }
}
