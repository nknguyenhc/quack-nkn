import dotenv from 'dotenv';
import { getConnection } from '../utils/db';
import bcrypt from "bcryptjs";
import { DataTypes, Model } from 'sequelize';
import { getRandomString } from '../utils/primitives';

dotenv.config();

const sequelize = getConnection();

type AdminType = {
    username: string,
    password: string,
    session?: string,
    expiry?: number,
};

type AuthenticatedAdminType = {
    username: string,
    session: string,
    expiry: Date,
};

export const Admin = sequelize.define<Model<AdminType>>('Admin', {
    username: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    session: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    expiry: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
});

export const isUsernameTaken = async (username: string): Promise<boolean> => {
    return Admin.findByPk(username).then(admin => admin !== null);
};

const getExpiry = (): number => Math.round(new Date().getTime() / 1000 + 3 * 3600 * 24);

const expiryNumberToDate = (number: number): Date => new Date(number * 1000);

const createSession = async (username: string): Promise<{
    session: string,
    expiry: Date,
}> => {
    const session = getRandomString();
    const expiry = getExpiry();
    await Admin.update({
        session: session,
        expiry: expiry,
    }, {
        where: { username: username },
    });
    return {
        session: session,
        expiry: expiryNumberToDate(expiry),
    };
};

export const createUser = async (username: string, password: string) => {
    return Admin.create({
        username: username,
        password: await bcrypt.hash(password, process.env.SALT!),
    });
};

export const authenticate = async (username: string, password: string): Promise<AuthenticatedAdminType | null> => {
    return Admin.findOne({
        where: { 
            username: username, 
            password: await bcrypt.hash(password, process.env.SALT!),
        },
    }).then(async admin => {
        if (admin === null) {
            return null;
        }
        const { session, expiry } = await createSession(username);
        return {
            username: username,
            session: session,
            expiry: expiry,
        };
    });
};

export const getUser = async (session: string): Promise<AuthenticatedAdminType | null> => {
    return Admin.findOne({
        where: { session: session },
    }).then(async admin => {
        if (admin === null) {
            return null;
        }

        if (admin.dataValues.expiry < new Date().getTime() / 1000) {
            return null;
        }

        const newExpiry = getExpiry();
        await Admin.update({
            expiry: newExpiry,
        }, {
            where: { session: session },
        });
        return {
            username: admin.dataValues.username,
            session: session,
            expiry: expiryNumberToDate(newExpiry),
        };
    });
};
