import { NextFunction, Response } from "express";
import { CustomRequest } from "../utils/request";
import { getUser } from "./db";

export const detectUser = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const session = req.cookies['session'];
    if (session) {
        const user = await getUser(session);
        if (user) {
            req.user = {
                username: user.username,
            };
        }
    }
    next();
}
