enum STATE {
    // normal
    NORMAL,

    // reminder
    REMINDER_START,
    REMINDER_FREQUENCY,
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
        UserStates.#states[chatId] = state;
    }
}

export default UserStates;
