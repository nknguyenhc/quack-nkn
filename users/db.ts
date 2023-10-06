import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DATABASE_NAME as string,
    process.env.DATABASE_USERNAME as string,
    process.env.DATABASE_PASSWORD as string,
    {
        host: process.env.DATABASE_HOST as string,
        port: Number(process.env.DATABASE_PORT),
        dialect: 'postgres',
    }
);

export const User = sequelize.define('User', {
    chatId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    }
});

switch (process.argv[2]) {
    case 'migrate':
        User.sync({ alter: true });
        break;
    case 'clear':
        User.sync({ force: true });
        break;
}
