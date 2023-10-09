enum STATE {
    // normal
    NORMAL,

    // reminder
    REMINDER_START,

    REMINDER_ADD,
    REMINDER_FREQUENCY,
    REMINDER_DAILY,
    REMINDER_WEEKLY,
    REMINDER_ONCE,

    REMINDER_VIEW,

    REMINDER_EDIT,

    REMINDER_DELETE,
}

type Dict = {
    [key: number]: {
        state: STATE,
        questionId?: number,
    },
}

class UserStates {
    static STATE = STATE;
    static #states: Dict = {};

    static getUserState(chatId: number): STATE {
        if (!(chatId in UserStates.#states)) {
            return STATE.NORMAL
        }
        return UserStates.#states[chatId].state;
    }

    static setUserState(chatId: number, state: STATE): void {
        if (state === STATE.NORMAL) {
            delete UserStates.#states[chatId];
            return;
        }
        UserStates.#states[chatId] = {
            ...UserStates.#states[chatId],
            state
        };
    }

    static getUserQuestionId(chatId: number): number {
        if (!(chatId in UserStates.#states)) {
            return undefined;
        }
        return UserStates.#states[chatId].questionId;
    }

    static setUserQuestionId(chatId: number, questionId: number): void {
        UserStates.#states[chatId] = {
            ...UserStates.#states[chatId],
            questionId,
        };
    }
}

export default UserStates;
