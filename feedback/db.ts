import dotenv from 'dotenv';
import { getConnection } from '../utils/db';
import { DataTypes, Model } from 'sequelize';
import Logger from "../logging/logger";

dotenv.config();

const sequelize = getConnection();

type FileType = {
    id: string,
    name: string,
    path: string,
    feedbackId: string,
};

type FeedbackType = {
    id: string,
    title: string,
    contact: string,
    body: string,
};

export const File = sequelize.define<Model<FileType>>('File', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    path: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    feedbackId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

export const Feedback = sequelize.define<Model<FeedbackType>>('Feedback', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    title: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    contact: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
});
