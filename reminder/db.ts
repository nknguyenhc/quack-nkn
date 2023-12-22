import { DataTypes, Model } from "sequelize";
import { getConnection } from '../utils/db';
import { FrequencyType } from '../utils/schedule';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = getConnection();

export type ReminderType = {
    id: string,
    content: string,
    frequency: FrequencyType,
    userChatId: string,
    time: number,
}

export const Reminder = sequelize.define<Model<ReminderType>>('Reminder', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    frequency: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userChatId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    time: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});
