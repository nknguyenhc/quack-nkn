import { NextFunction, Request, Response } from "express";
import { getUser } from "./db";

export const detectUser = async (req: Request, res: Response, next: NextFunction) => {
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
