import { NextFunction, Request, Response } from "express";
import Logger from './logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const oldEnd = res.end;
    res.end = function () {
        Logger.getInfoLogger().log(`HTTP ${req.method} ${req.path} ${res.statusCode}`);
        oldEnd.apply(res, arguments);
        return res;
    };
    next();
};
