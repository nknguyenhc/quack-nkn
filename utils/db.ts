import { Dialect, Sequelize } from "sequelize";

export const getConnection = () => new Sequelize(
    process.env.DATABASE_NAME as string,
    process.env.DATABASE_USERNAME as string,
    process.env.DATABASE_PASSWORD as string,
    {
        host: process.env.DATABASE_HOST as string,
        port: Number(process.env.DATABASE_PORT),
        dialect: process.env.DATABASE_DIALECT as Dialect,
        logging: false,
    }
);
