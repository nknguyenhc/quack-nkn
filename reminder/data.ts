import { PollType } from "../utils/types";

export const frequencyPoll: PollType = {
    question: 'How frequently do you want me to remind you?',
    options: [
        [{
            text: 'Daily',
            callback_data: 'daily',
        }],
        [{
            text: 'Weekly',
            callback_data: 'weekly',
        }],
        [{
            text: 'Once',
            callback_data: 'once',
        }],
    ],
};

export const dailyPoll: PollType = {
    question: "When in the day do you want me to remind you?",
    options: [
        [
            {
                text: '0 AM',
                callback_data: '0',
            },
            {
                text: '1 AM',
                callback_data: '1',
            },
            {
                text: '2 AM',
                callback_data: '2',
            },
            {
                text: '3 AM',
                callback_data: '3',
            },
        ],
        [
            {
                text: '4 AM',
                callback_data: '4',
            },
            {
                text: '5 AM',
                callback_data: '5',
            },
            {
                text: '6 AM',
                callback_data: '6',
            },
            {
                text: '7 AM',
                callback_data: '7',
            },
        ],
        [
            {
                text: '8 AM',
                callback_data: '8',
            },
            {
                text: '9 AM',
                callback_data: '9',
            },
            {
                text: '10 AM',
                callback_data: '10',
            },
            {
                text: '11 AM',
                callback_data: '11',
            },
        ],
        [
            {
                text: '12 PM',
                callback_data: '12',
            },
            {
                text: '1 PM',
                callback_data: '13',
            },
            {
                text: '2 PM',
                callback_data: '14',
            },
            {
                text: '3 PM',
                callback_data: '15',
            },
        ],
        [
            {
                text: '4 PM',
                callback_data: '16',
            },
            {
                text: '5 PM',
                callback_data: '17',
            },
            {
                text: '6 PM',
                callback_data: '18',
            },
            {
                text: '7 PM',
                callback_data: '19',
            },
        ],
        [
            {
                text: '8 PM',
                callback_data: '20',
            },
            {
                text: '9 PM',
                callback_data: '21',
            },
            {
                text: '10 PM',
                callback_data: '22',
            },
            {
                text: '11 PM',
                callback_data: '23',
            },
        ],
    ],
};

export const weeklyPoll: PollType = {
    question: "Which day do you want me to remind you every week?",
    options: [
        [
            {
                text: "Mon 6AM",
                callback_data: "0",
            },
            {
                text: "Mon 12PM",
                callback_data: "1",
            },
            {
                text: "Mon 6PM",
                callback_data: "2",
            },
            {
                text: "Mon 10PM",
                callback_data: "3",
            },
        ],
        [
            {
                text: "Tues 6AM",
                callback_data: "4",
            },
            {
                text: "Tues 12PM",
                callback_data: "5",
            },
            {
                text: "Tues 6PM",
                callback_data: "6",
            },
            {
                text: "Tues 10PM",
                callback_data: "7",
            },
        ],
        [
            {
                text: "Wed 6AM",
                callback_data: "8",
            },
            {
                text: "Wed 12PM",
                callback_data: "9",
            },
            {
                text: "Wed 6PM",
                callback_data: "10",
            },
            {
                text: "Wed 10PM",
                callback_data: "11",
            },
        ],
        [
            {
                text: "Thu 6AM",
                callback_data: "12",
            },
            {
                text: "Thu 12PM",
                callback_data: "13",
            },
            {
                text: "Thu 6PM",
                callback_data: "14",
            },
            {
                text: "Thu 10PM",
                callback_data: "15",
            },
        ],
        [
            {
                text: "Fri 6AM",
                callback_data: "16",
            },
            {
                text: "Fri 12PM",
                callback_data: "17",
            },
            {
                text: "Fri 6PM",
                callback_data: "18",
            },
            {
                text: "Fri 10PM",
                callback_data: "19",
            },
        ],
        [
            {
                text: "Sat 6AM",
                callback_data: "20",
            },
            {
                text: "Sat 12PM",
                callback_data: "21",
            },
            {
                text: "Sat 6PM",
                callback_data: "22",
            },
            {
                text: "Sat 10PM",
                callback_data: "23",
            },
        ],
        [
            {
                text: "Sun 6AM",
                callback_data: "24",
            },
            {
                text: "Sun 12PM",
                callback_data: "25",
            },
            {
                text: "Sun 6PM",
                callback_data: "26",
            },
            {
                text: "Sun 10PM",
                callback_data: "27",
            },
        ],
    ],
};

export const onceQuestion = 'When do you want me to remind you?\n'
    + 'Please key in time in the following format: DD/MM/YYYY HH:MM';

export const typePoll: PollType = {
    question: "What do you want to edit?",
    options: [
        [{
            text: "Content",
            callback_data: "content",
        }],
        [{
            text: "Frequency",
            callback_data: "frequency",
        }],
        [{
            text: "Time of reminder",
            callback_data: "time",
        }],
    ],
};
