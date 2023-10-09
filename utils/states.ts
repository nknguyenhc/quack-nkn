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

    REMINDER_EDIT,

    REMINDER_DELETE,
}

type KnownCommandHelper = {
    commands: Array<RegExp>,
    errorMessage: string,
    allowPlain: boolean,
};

export const knownCommands: Map<STATE, KnownCommandHelper> = new Map<STATE, KnownCommandHelper>([
    [STATE.NORMAL, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/reminder$/],
        errorMessage: 'Invalid command, here is the current list of available commands:\n'
            + '/start - show start message\n'
            + '/cancel - cancel any operation at any time\n'
            + '/reminder - add, view, edit or delete your reminders',
        allowPlain: false,
    }],
    [STATE.REMINDER_START, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/add$/, /^\/list$/, /^\/edit$/, /^\/delete$/],
        errorMessage: 'Invalid command, here is the current list of available commands for reminder:\n'
            + '/start - show start message\n'
            + '/cancel - exit from reminders\n'
            + '/add - add a new reminder\n'
            + '/list - view your list of reminders\n'
            + '/edit - edit a reminder\n'
            + '/delete - delete a reminder',
        allowPlain: false,
    }],
    [STATE.REMINDER_ADD, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding this reminder',
        allowPlain: true,
    }],
    [STATE.REMINDER_FREQUENCY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding this reminder',
        allowPlain: false,
    }],
    [STATE.REMINDER_DAILY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding this reminder',
        allowPlain: false,
    }],
    [STATE.REMINDER_WEEKLY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding this reminder',
        allowPlain: false,
    }],
    [STATE.REMINDER_ONCE, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding this reminder',
        allowPlain: true,
    }],
])

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