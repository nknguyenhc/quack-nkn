import { Request, Response } from "express";
import { authenticate } from "./db";

export const authenticateUser = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).send({
            message: "Invalid request",
        });
        return;
    }

    const user = await authenticate(username, password);
    if (!user) {
        res.send({
            message: "Wrong username or password",
        });
        return;
    }

    res.cookie('session', user.session, { expires: user.expiry });
    res.send({
        message: "Success",
    });
};

export const logoutUser = async (req: Request, res: Response) => {
    res.clearCookie('session');
    res.send({
        message: "Success",
    });
};
