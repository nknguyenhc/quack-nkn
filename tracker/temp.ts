import { FrequencyType } from "../utils/schedule";

type TrackType = {
    link?: string,
    selector?: string,
    caption?: string,
    frequency?: FrequencyType
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

    static setCaption(chatId: number, caption: string) {
        TrackMemory.#tracks[chatId].caption = caption;
    }

    static setFrequency(chatId: number, frequency: FrequencyType) {
        TrackMemory.#tracks[chatId].frequency = frequency;
    }

    static deleteUser(chatId: number) {
        delete TrackMemory.#tracks[chatId];
    }
}
