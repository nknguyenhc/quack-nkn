enum STATE {
    // normal
    NORMAL,

    // reminder
    REMINDER_START,
    REMINDER_FREQUENCY,
    REMINDER_DAILY,
    REMINDER_WEEKLY,
    REMINDER_ONCE,
}

type Dict = {
    [key: number]: STATE,
}

class UserStates {
    static STATE = STATE;
    static #states: Dict = {};
    static getUserState(chatId: number): STATE {
        if (!(chatId in UserStates.#states)) {
            return STATE.NORMAL
        }
        return UserStates.#states[chatId];
    }
    static setUserState(chatId: number, state: STATE): void {
        if (state === STATE.NORMAL) {
            delete UserStates.#states[chatId];
            return;
        }
        UserStates.#states[chatId] = state;
    }
}

export default UserStates;
