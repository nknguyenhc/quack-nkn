import { Model, DataTypes } from 'sequelize';
import { getConnection } from '../utils/db';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = getConnection();

export type CountType = {
    month: number,
    count: number,
};

export const TrackerCount = sequelize.define<Model<CountType>>('TrackerCount', {
    month: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
});

export const ReminderCount = sequelize.define<Model<CountType>>('ReminderCount', {
    month: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
});
