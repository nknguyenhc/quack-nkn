import Logger from "../logging/logger";

enum STATE {
    // normal
    NORMAL,
    ADD,
    LIST,
    EDIT,
    DELETE,

    // timezone
    TIMEZONE,
    TIMEZONE_CONFIRM,

    // reminder
    REMINDER_START,

    REMINDER_ADD,
    REMINDER_FREQUENCY,
    REMINDER_DAILY,
    REMINDER_WEEKLY,
    REMINDER_ONCE,

    REMINDER_EDIT,
    REMINDER_EDIT_TYPE,
    REMINDER_EDIT_CONTENT,
    REMINDER_EDIT_FREQUENCY,
    REMINDER_EDIT_DAILY,
    REMINDER_EDIT_WEEKLY,
    REMINDER_EDIT_ONCE,

    REMINDER_DELETE,

    // tracker
    TRACK_START,

    TRACK_ADD,
    TRACK_CONFIRM,
    TRACK_SELECTOR,
    TRACK_INDEX,
    TRACK_SELECTOR_CONFIRM,
    TRACK_CAPTION,
    TRACK_FREQUENCY,
    TRACK_DAILY,
    TRACK_WEEKLY,
    TRACK_ONCE,

    TRACK_EDIT,
    TRACK_EDIT_TYPE,
    TRACK_EDIT_LINK,
    TRACK_EDIT_LINK_CONFIRM,
    TRACK_EDIT_SELECTOR,
    TRACK_EDIT_INDEX,
    TRACK_EDIT_SELECTOR_CONFIRM,
    TRACK_EDIT_CAPTION,
    TRACK_EDIT_FREQUENCY,
    TRACK_EDIT_DAILY,
    TRACK_EDIT_WEEKLY,
    TRACK_EDIT_ONCE,

    TRACK_DELETE,
}

type KnownCommandHelper = {
    commands: Array<RegExp>,
    errorMessage: string,
    allowPlain: boolean,
};

export const knownCommands: Map<STATE, KnownCommandHelper> = new Map<STATE, KnownCommandHelper>([
    [STATE.NORMAL, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/timezone$/, /^\/reminder$/, /^\/track$/, /^\/add$/, /^\/list$/, /^\/edit$/, /^\/delete$/],
        errorMessage: 'Invalid command, here is the current list of available commands:\n'
            + '/start - show start message\n'
            + '/cancel - cancel any operation at any time\n'
            + '/timezone - set your timezone\n'
            + '/reminder - add, view, edit or delete your reminders\n'
            + '/track - add, view, edit or delete your website trackers\n'
            + '/add - add a new reminder or a website tracker\n'
            + '/list - view your list of reminders or website trackers\n'
            + '/edit - edit one of your reminders or website trackers\n'
            + '/delete - delete one of your reminders or website trackers\n',
        allowPlain: false,
    }],
    [STATE.ADD, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/reminder$/, /^\/track$/],
        errorMessage: 'Invalid command, here is what you can choose to add:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding\n'
            + '/reminder - add a reminder\n'
            + '/track - add a website tracker',
        allowPlain: false,
    }],
    [STATE.LIST, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/reminder$/, /^\/track$/],
        errorMessage: 'Invalid command, here is what you can choose to view:\n'
            + '/start - show start message\n'
            + '/cancel - cancel viewing\n'
            + '/reminder - view your reminders\n'
            + '/track - view your website trackers',
        allowPlain: false,
    }],
    [STATE.EDIT, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/reminder$/, /^\/track$/],
        errorMessage: 'Invalid command, here is what you can choose to edit:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding\n'
            + '/reminder - edit a reminder\n'
            + '/track - edit a website tracker',
        allowPlain: false,
    }],
    [STATE.DELETE, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/reminder$/, /^\/track$/],
        errorMessage: 'Invalid command, here is what you can choose to delete:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding\n'
            + '/reminder - delete a reminder\n'
            + '/track - delete a website tracker',
        allowPlain: false,
    }],
    [STATE.TIMEZONE, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the list of commands for changing timezone:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding timezone\n',
        allowPlain: false,
    }],
    [STATE.TIMEZONE_CONFIRM, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the list of commands for changing timezone:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding timezone\n',
        allowPlain: true,
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
    [STATE.REMINDER_EDIT, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing reminder',
        allowPlain: true,
    }],
    [STATE.REMINDER_EDIT_TYPE, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing reminder',
        allowPlain: false,
    }],
    [STATE.REMINDER_EDIT_CONTENT, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing reminder',
        allowPlain: true,
    }],
    [STATE.REMINDER_EDIT_FREQUENCY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing reminder',
        allowPlain: false,
    }],
    [STATE.REMINDER_EDIT_DAILY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing reminder',
        allowPlain: false,
    }],
    [STATE.REMINDER_EDIT_WEEKLY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing reminder',
        allowPlain: false,
    }],
    [STATE.REMINDER_EDIT_ONCE, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing reminder',
        allowPlain: true,
    }],
    [STATE.REMINDER_DELETE, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for deleting reminder:\n'
            + '/start - show start message\n'
            + '/cancel - cancel deleting reminder',
        allowPlain: true,
    }],
    [STATE.TRACK_START, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/add$/, /^\/list$/, /^\/edit$/, /^\/delete$/],
        errorMessage: 'Invalid command, here is the current list of available commands for tracking:\n'
            + '/start - show start message\n'
            + '/cancel - exit from tracking\n'
            + '/add - add a new website tracker\n'
            + '/list - view your list of website trackers\n'
            + '/edit - edit a website tracker\n'
            + '/delete - delete a website tracker',
        allowPlain: false,
    }],
    [STATE.TRACK_ADD, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_CONFIRM, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_SELECTOR, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/selector$/],
        errorMessage: 'Invalid command, here is the current list of available commands for indicating page section:\n'
            + '/start - show start message\n'
            + '/selector - more info about query selector\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_INDEX, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_SELECTOR_CONFIRM, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_CAPTION, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_FREQUENCY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_DAILY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_WEEKLY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_ONCE, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for adding a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel adding a website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_TYPE, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/link$/, /^\/selector$/, /^\/caption$/, /^\/frequency$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker\n'
            + '/link - change the link of the tracker you have chosen\n'
            + '/selector - change the section of the webpage you want to track\n'
            + '/caption - change the caption of the tracker you have chosen\n'
            + '/frequency - change the frequency or timing of the tracker you have chosen',
        allowPlain: false,
    }],
    [STATE.TRACK_EDIT_LINK, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_LINK_CONFIRM, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_SELECTOR, {
        commands: [/^\/start$/, /^\/cancel$/, /^\/selector$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/selector - more info about query selector\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_SELECTOR_CONFIRM, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_INDEX, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_CAPTION, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_FREQUENCY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_DAILY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_WEEKLY, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_EDIT_ONCE, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for editing a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel editing website tracker',
        allowPlain: true,
    }],
    [STATE.TRACK_DELETE, {
        commands: [/^\/start$/, /^\/cancel$/],
        errorMessage: 'Invalid command, here is the current list of available commands for deleting a website tracker:\n'
            + '/start - show start message\n'
            + '/cancel - cancel deleting website tracker',
        allowPlain: true,
    }],
]);

export const knownAdminCommands: Array<RegExp> = [
    /^\/ban/,
    /^\/unban/,
];

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
        Logger.getDebugLogger().log(`Changing state of user ${chatId} to ${STATE[state]}`);
        if (state === STATE.NORMAL) {
            delete UserStates.#states[chatId];
            return;
        }
        UserStates.#states[chatId] = {
            ...UserStates.#states[chatId],
            state
        };
    }

    static getUserQuestionId(chatId: number): number | undefined {
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
