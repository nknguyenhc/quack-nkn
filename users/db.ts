import { DataTypes, Model } from 'sequelize';
import { getConnection } from '../utils/db';
import { Reminder } from '../reminder/db';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = getConnection();

type UserType = {
    chatId: string,
    username: string | undefined,
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
});

User.hasMany(Reminder, {
    foreignKey: {
        name: 'userChatId',
        allowNull: false,
    },
});

switch (process.argv[2]) {
    case 'migrate':
        User.sync({ alter: true });
        break;
    case 'clear':
        User.sync({ force: true });
        break;
}
