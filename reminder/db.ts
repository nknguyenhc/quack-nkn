import { DataTypes, Model } from "sequelize";
import { getConnection } from '../utils/db';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = getConnection();

export type FrequencyType = 'daily' | 'weekly' | 'monthly';

type ReminderType = {
    content: string,
    frequency: FrequencyType,
    userChatId: number,
}

export const Reminder = sequelize.define<Model<ReminderType>>('Reminder', {
    content: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    frequency: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userChatId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

switch (process.argv[2]) {
    case 'migrate':
        Reminder.sync({ alter: true });
        break;
    case 'clear':
        Reminder.sync({ force: true });
        break;
}
