import { DataTypes, Model } from 'sequelize';
import { getConnection } from '../utils/db';
import { Reminder } from '../reminder/db';
import dotenv from 'dotenv';
import { Tracker } from '../tracker/db';

dotenv.config();

const sequelize = getConnection();

type UserType = {
    chatId: string,
    username: string | undefined,
    timezone: number,
    firstname: string | undefined,
    lastname: string | undefined,
    isBlocked: boolean,
}

export const User = sequelize.define<Model<UserType>>('User', {
    chatId: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    timezone: {
        type: DataTypes.INTEGER,
        defaultValue: 8,
    },
    firstname: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastname: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isBlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
});

User.hasMany(Reminder, {
    foreignKey: {
        name: 'userChatId',
        allowNull: false,
    },
});

User.hasMany(Tracker, {
    foreignKey: {
        name: 'userChatId',
        allowNull: false,
    },
});

export const getTimezone = async (chatId: number): Promise<number> => (await User.findOne({
    where: {
        chatId: String(chatId),
    },
})).dataValues.timezone;
