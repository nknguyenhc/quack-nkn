import UserStates from "../utils/states";

enum LOGLEVEL {
    DEBUG,
    INFO,
    WARNING,
    ERROR,
};

export default class Logger {
    private logLevel: LOGLEVEL;
    
    private static debugLogger = new Logger(LOGLEVEL.DEBUG);
    private static infoLogger = new Logger(LOGLEVEL.INFO);
    private static warningLogger = new Logger(LOGLEVEL.WARNING);
    private static errorLogger = new Logger(LOGLEVEL.ERROR);

    private constructor(logLevel: LOGLEVEL) {
        this.logLevel = logLevel;
    }

    public static getDebugLogger(): Logger {
        return Logger.debugLogger;
    }

    public static getInfoLogger(): Logger {
        return Logger.infoLogger;
    }

    public static getWarningLogger(): Logger {
        return Logger.warningLogger;
    }

    public static getErrorLogger(): Logger {
        return Logger.errorLogger;
    }

    public log(msg: any): void {
        console.log(`${LOGLEVEL[this.logLevel]}: ${msg}`);
    }

    public commandLog(chatId: number, command: string) {
        this.log(`User ${chatId} executed \"${command}\" at state ${UserStates.STATE[UserStates.getUserState(chatId)]}`);
    }

    public messageLog(chatId: number, message: string) {
        this.log(`User ${chatId} messaged \"${message}\" at state ${UserStates.STATE[UserStates.getUserState(chatId)]}`);
    }

    public pollAnswerLog(chatId: number, pollAnswer: string) {
        this.log(`User ${chatId} answered poll with \"${pollAnswer}\" at state ${UserStates.STATE[UserStates.getUserState(chatId)]}`);
    }

    public fileNotFoundLog(filename: string) {
        this.log(`Cannot find file ${filename}`);
    }
}
