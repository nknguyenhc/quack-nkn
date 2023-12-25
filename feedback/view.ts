import { Response } from "express";
import { CustomRequest } from "../utils/request";
import { Feedback, File } from "./db";
import { getRandomString } from "../utils/primitives";

export const postFeedbackForm = async (req: CustomRequest, res: Response) => {
    const { title, contact, message } = req.body;
    if (!title || !contact || !message) {
        res.status(400).send({
            message: "Invalid request",
        });
        return;
    }

    const feedbackId = getRandomString();
    await Feedback.create({
        id: feedbackId,
        title: title,
        contact: contact,
        body: message,
    });
    
    if (req.files) {
        const files = req.files.files;
        if (Array.isArray(files)) {
            files.forEach(async file => {
                const id = getRandomString();
                await File.create({
                    id: id,
                    name: file.name,
                    path: file.path,
                    feedbackId: feedbackId,
                });
            });
        }
    }
    res.send({
        message: "Success",
    });
}
