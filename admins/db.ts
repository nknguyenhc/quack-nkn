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

const getExpiry = () => new Date().getTime() / 1000 + 3 * 2600 * 24;

const createSession = async (username: string): Promise<string> => {
    const session = getRandomString();
    const expiry = getExpiry();
    await Admin.update({
        session: session,
        expiry: expiry,
    }, {
        where: { username: username },
    });
    return session;
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
        const session = await createSession(username);
        return {
            username: username,
            session: session,
        }
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

        await Admin.update({
            expiry: getExpiry(),
        }, {
            where: { session: session },
        });
        return {
            username: admin.dataValues.username,
            session: session,
        };
    });
};
