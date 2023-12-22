
import { DataTypes, Model } from 'sequelize';
import { getConnection } from '../utils/db';
import { FrequencyType } from '../utils/schedule';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = getConnection();

export type TrackerType = {
    id: string,
    address: string,
    selector: string,
    selectorIndex?: number,
    caption: string,
    frequency: FrequencyType,
    userChatId: string,
    time: number,
}

export const Tracker = sequelize.define<Model<TrackerType>>('Tracker', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    selector: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    selectorIndex: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    caption: {
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
