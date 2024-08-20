import { Dialect, Model, ModelStatic, Sequelize } from "sequelize";
import { MakeNullishOptional } from "sequelize/types/utils";

export const getConnection = () => new Sequelize(
    process.env.DATABASE_NAME as string,
    process.env.DATABASE_USERNAME as string,
    (process.env.DATABASE_PASSWORD as string).replace(/\\/g, ""),
    {
        host: process.env.DATABASE_HOST as string,
        port: Number(process.env.DATABASE_PORT),
        dialect: process.env.DATABASE_DIALECT as Dialect,
        logging: false,
    }
);

export const extractTable = async <T extends any>(table: ModelStatic<Model<T, T>>): Promise<Array<T>> => {
    return table.findAll().then(values => values.map(value => value.dataValues));
};

export const importTable = async <T extends object>(data: Array<MakeNullishOptional<T>>,
        table: ModelStatic<Model<T, T>>): Promise<void> => {
    await table.sync({ force: true });
    for (const dataPoint of data) {
        await table.create(dataPoint);
    }
};
