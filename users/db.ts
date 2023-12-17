import { DataTypes, Model } from 'sequelize';
import { getConnection } from '../utils/db';
import { Reminder } from '../reminder/db';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = getConnection();

type UserType = {
    chatId: string,
    username: string | undefined,
    timezone: number,
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
    }
});

User.hasMany(Reminder, {
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
