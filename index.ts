import TelegramBot, { Message } from 'node-telegram-bot-api';
import { plainUserHandlers, pollUserHandlers, textUserHandlers } from './users/handlers';
import { textReminderHandlers, plainReminderHandlers, pollAnswerReminderHandlers } from './reminder/handlers';
import reminderStartJob from './reminder/start';
import { trackPlainHandler, trackPollHandler, trackTextHandlers } from './tracker/handlers';
import dotenv from 'dotenv';
import { User } from './users/db';
import { Reminder } from './reminder/db';
import { Tracker } from './tracker/db';
import { Admin, authenticate, createUser, isUsernameTaken } from './admins/db';
import trackStartJob from './tracker/start';
import Logger from './logging/logger';
import express from "express";
import pug from "pug";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdir, readdirSync, writeFile, writeFileSync } from "fs";
import * as sass from "sass";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import adminRouter from "./admins/router";
import { detectUser } from "./admins/middleware";
import feedbackRouter from "./feedback/router";
import formDataParser from "express-form-data";
import { File, Feedback } from "./feedback/db";
import { loggingMiddleware } from "./logging/middleware";
import userStartJob from "./users/start";
import { UserManager } from './users/temp';
import UserStates, { knownAdminCommands, knownCommands } from './utils/states';
import { extractTable, importTable } from './utils/db';

dotenv.config({
    override: true,
});

function main() {
    const bot = new TelegramBot(process.env.TOKEN as string, { polling: true });

    reminderStartJob(bot);
    trackStartJob(bot);
    userStartJob(bot);

    [...textUserHandlers, ...textReminderHandlers, ...trackTextHandlers].forEach((handler) => {
        bot.onText(handler.command, (msg: Message) => {
            const chatId = msg.chat.id;
            if (UserManager.isUserBlocked(chatId)) {
                return;
            }
            handler.handler(bot)(msg);
        });
    });

    [...plainUserHandlers, ...plainReminderHandlers, ...trackPlainHandler].forEach((handler) => {
        bot.on('message', (msg: Message) => {
            const chatId = msg.chat.id;
            if (UserManager.isUserBlocked(chatId)) {
                return;
            }
            if (msg.text.startsWith('/')) {
                return;
            }
            handler.handler(bot)(msg);
        });
    });

    [...pollUserHandlers, ...pollAnswerReminderHandlers, ...trackPollHandler].forEach((handler) => {
        bot.on("callback_query", handler.handler(bot));
    });

    bot.on("message", (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserManager.isUserBlocked(chatId)) {
            Logger.getWarningLogger().log(`Blocked user ${chatId} is trying to message ${msg.text}`);
            bot.sendMessage(chatId, "You are blocked, please contact administrator for more details.");
        }
    });

    bot.on("message", (msg: Message) => {
        const chatId = msg.chat.id;
        if (UserManager.isUserBlocked(chatId)) {
            return;
        }
        const stateInfo = knownCommands.get(UserStates.getUserState(chatId))!;
        const isMessageRecognised = 
            stateInfo.commands.some(regex => msg.text?.match(regex)) || (stateInfo.allowPlain && !msg.text?.startsWith("/"));
        const isAdminRecognised = UserManager.isAdmin(chatId) && knownAdminCommands.some(regex => msg.text?.match(regex));
        if (!isMessageRecognised && !isAdminRecognised) {
            Logger.getInfoLogger().log(`User ${chatId} executed an unknown command: \"${msg.text}\"`);
            bot.sendMessage(chatId, stateInfo.errorMessage);
        }
    });

    Logger.getInfoLogger().log("Bot is ready to receive requests.");
}

function serve() {
    const app = express();

    migrateFiles('assets', 'static/assets');
    compilePugFiles();
    combineFiles('scripts', 'static/index.js');
    compileStyles();
    combineFiles('styles-compiled', 'static/index.css');

    app.use(loggingMiddleware);
    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(formDataParser.parse({
        uploadDir: __dirname + "/uploads",
    }));
    app.use(detectUser);
    app.use('/static', express.static('static'));
    app.use('/user', adminRouter);
    app.use('/api/feedback', feedbackRouter);

    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/templates/index.html');
    });

    app.get('/dashboard', (req, res) => {
        res.sendFile(__dirname + '/templates/dashboard.html');
    });
    
    app.get('/feedback', (req, res) => {
        res.sendFile(__dirname + '/templates/feedback.html');
    });

    app.get('/terms-of-services', (req, res) => {
        res.sendFile(__dirname + '/templates/terms-of-services.html');
    });

    app.get('/login', (req, res) => {
        res.sendFile(__dirname + '/templates/login-page.html');
    });

    app.get('/favicon.ico', (req, res) => {
        res.sendFile(__dirname + '/icon.png');
    });

    app.use('*', (req, res) => {
        res.status(404).sendFile(__dirname + '/templates/404.html');
    });

    app.listen(process.env.PORT, () => Logger.getInfoLogger().log(`Server is listening on port ${process.env.PORT}`))
}

function migrateFiles(source: string, dest: string) {
    readdir(source, (err, files) => {
        if (err) {
            Logger.getErrorLogger().log(`Error opening folder "${source}"`);
            Logger.getDebugLogger().log(err);
        } else {
            files.forEach(filename => {
                const data = readFileSync(`${source}/${filename}`);
                writeFile(`${dest}/${filename}`, data, (err) => {
                    if (err) {
                        Logger.getErrorLogger().log(`Error transferring file ${filename}`);
                        Logger.getDebugLogger().log(err);
                    }
                });
            });
            Logger.getInfoLogger().log(`Successfully transferred files from "${source}" to "${dest}"`);
        }
    });
}

function compilePugFiles() {
    const pugs = {
        'index.pug': 'index.html',
        'dashboard.pug': 'dashboard.html',
        'feedback.pug': 'feedback.html',
        'terms-of-services.pug': 'terms-of-services.html',
        'login-page.pug': 'login-page.html',
        'feedbacks.pug': 'feedbacks.html',
        '404.pug': '404.html',
    };
    for (const pugFile of Object.keys(pugs)) {
        const compiledFunction = pug.compileFile(`pug/${pugFile}`);
        writeFile(`templates/${pugs[pugFile]}`, compiledFunction(), (err) => {
            if (err) {
                Logger.getErrorLogger().log(`Failed to write HTML file ${pugs[pugFile]}`);
                Logger.getDebugLogger().log(err);
            } else {
                Logger.getInfoLogger().log(`Successfully compiled ${pugFile} to ${pugs[pugFile]}`);
            }
        });
    }
}

function combineFiles(folder: string, outFile: string) {
    readdir(folder, (err, files) => {
        if (err) {
            Logger.getErrorLogger().log(`Failed to read "${folder}" directory.`);
            Logger.getDebugLogger().log(err);
        } else {
            writeFileSync(outFile, "");
            files.forEach(filename => {
                const data = readFileSync(`${folder}/${filename}`);
                appendFileSync(outFile, data);
            });
            Logger.getInfoLogger().log(`Successfully combined all files from "${folder}" into "${outFile}"`);
        }
    });
}

function compileStyles() {
    const files = readdirSync('styles')
    files.forEach(filename => {
        const name = filename.slice(0, -5);
        const res = sass.renderSync({ file: `styles/${filename}` });
        writeFileSync(`styles-compiled/${name}.css`, res.css);
    });
    Logger.getInfoLogger().log(`Successfully compiled all style files.`);
}

async function migrate() {
    await User.sync({ alter: true });
    await Reminder.sync({ alter: true });
    await Tracker.sync({ alter: true });
    await Admin.sync({ alter: true });
    await File.sync({ alter: true });
    await Feedback.sync({ alter: true });
}

async function clear() {
    await User.sync({ force: true });
    await Reminder.sync({ force: true });
    await Tracker.sync({ force: true });
    await Admin.sync({ force: true });
    await File.sync({ force: true});
    await Feedback.sync({ force: true });
}

async function setup() {
    const folders: Array<string> = [
        "media",
        "static",
        "static/assets",
        "styles-compiled",
        "templates",
        "uploads",
    ];
    for (const folder of folders) {
        if (!existsSync(folder)) {
            mkdirSync(folder);
        }
    }

    if (process.env.ADMIN_USERNAME != undefined && process.env.ADMIN_PASSWORD != undefined) {
        const user = await authenticate(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
        if (!user) {
            await createUser(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
        }
    }
}

async function createAdmin() {
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    const BACKSPACE = String.fromCharCode(8);

    function handleBackspace(prompt: string) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(prompt);
    }

    var username = '';
    var password = '';
    var confirmPassword = '';
    type State = 'username' | 'password' | 'confirm-password';
    var state: State = 'username';

    async function handleCreateUser() {
        await createUser(username, password);
        Logger.getInfoLogger().log("Successfully created user!");
    }

    process.stdout.write("Username: ");
    process.stdin.on('data', async (ch) => {
        const c = ch.toString('utf8');
        if (c.length === 3) {
            return;
        }

        switch (c) {
            case "\n":
            case "\r":
            case "\u0004":
                switch (state) {
                    case 'username':
                        process.stdout.write("\n");
                        if (await isUsernameTaken(username)) {
                            Logger.getWarningLogger().log("Username is taken!");
                            process.stdout.write("Username: ");
                            username = '';
                            break;
                        }
                        process.stdout.write("Password: ");
                        state = 'password';
                        break;
                    case 'password':
                        process.stdout.write("\nConfirm password: ");
                        state = 'confirm-password';
                        break;
                    case 'confirm-password':
                        process.stdout.write("\n");
                        if (password !== confirmPassword) {
                            Logger.getWarningLogger().log("Password and confirm password are different!");
                            password = '';
                            confirmPassword = '';
                            process.stdout.write("Password: ");
                            state = 'password';
                            break;
                        }
                        process.stdin.pause();
                        await handleCreateUser();
                        break;
                }
                break;
            case "\u0003":
                process.stdin.pause();
                break;
            case BACKSPACE:
                switch (state) {
                    case 'username':
                        username = username.slice(0, username.length - 1);
                        handleBackspace("Username: ");
                        process.stdout.write(username);
                        break;
                    case 'password':
                        password = password.slice(0, password.length - 1);
                        handleBackspace("Password: ");
                        process.stdout.write('*'.repeat(password.length));
                        break;
                    case 'confirm-password':
                        confirmPassword = confirmPassword.slice(0, confirmPassword.length - 1);
                        handleBackspace("Confirm password: ");
                        process.stdout.write('*'.repeat(confirmPassword.length));
                        break;
                }
                break;
            default:
                switch (state) {
                    case 'username':
                        username += c;
                        process.stdout.write(c);
                        break;
                    case 'password':
                        password += c;
                        process.stdout.write('*');
                        break;
                    case 'confirm-password':
                        confirmPassword += c;
                        process.stdout.write('*');
                        break;
                }
                break;
        }
    });
}

async function extractData() {
    const data = {
        user: await extractTable(User),
        reminder: await extractTable(Reminder),
        tracker: await extractTable(Tracker),
        admin: await extractTable(Admin),
        file: await extractTable(File),
        feedback: await extractTable(Feedback),
    };
    writeFileSync('data.json', JSON.stringify(data));
}

async function importData() {
    const data = JSON.parse(readFileSync('data.json').toString());
    await importTable(data.user, User);
    await importTable(data.reminder, Reminder);
    await importTable(data.tracker, Tracker);
    await importTable(data.admin, Admin);
    await importTable(data.file, File);
    await importTable(data.feedback, Feedback);
}

if (process.argv.length < 3) {
    main();
    serve();
} else {
    switch (process.argv[2]) {
        case 'migrate':
            migrate();
            break;
        case 'clear':
            clear();
            break;
        case 'bot':
            main();
            break;
        case 'serve':
            serve();
            break;
        case 'both':
            main();
            serve();
            break;
        case 'setup':
            setup();
            break;
        case 'createadmin':
            createAdmin();
            break;
        case 'extractdata':
            extractData();
            break;
        case 'importdata':
            importData();
            break;
    }
}
