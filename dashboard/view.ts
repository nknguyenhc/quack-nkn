import { Request, Response } from "express";
import { User } from '../users/db';
import { dashboardTimeToString, dateToString } from "../utils/primitives";
import { CountType, ReminderCount, TrackerCount } from "./db";
import { Model } from "sequelize";

type DataDict = {
    [key: string]: number,
};

export const userData = async (req: Request, res: Response) => {
    const users = await User.findAll();
    const data: DataDict = {};
    users.forEach((user) => {
        const key = dateToString(user.createdAt);
        if (key in data) {
            data[key] += 1;
        } else {
            data[key] = 1;
        }
    });
    res.send({
        data: data,
    });
};

export const usageData = async (req: Request, res: Response) => {
    const trackerCounts = await TrackerCount.findAll();
    const reminderCounts = await ReminderCount.findAll();
    const data: DataDict = {};
    const dataCallback = (count: Model<CountType, CountType>) => {
        const key = dashboardTimeToString(count.dataValues.month);
        if (key in data) {
            data[key] += 1;
        } else {
            data[key] = 1;
        }
    };
    trackerCounts.forEach(dataCallback);
    reminderCounts.forEach(dataCallback);
    res.send({
        data: data,
    });
};

export const timezoneData = async (req: Request, res: Response) => {
    const users = await User.findAll();
    const data: DataDict = {};
    users.forEach((user) => {
        const key = String(user.dataValues.timezone);
        if (key in data) {
            data[key] += 1;
        } else {
            data[key] = 1;
        }
    });
    res.send({
        data: data,
    });
};
