import { NextFunction, Response } from "express";
import { CustomRequest } from "../utils/request";
import { Feedback, File } from "./db";
import { getRandomString } from "../utils/primitives";
import path from "path";
import mime from "mime-types";

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
        } else {
            const id = getRandomString();
            await File.create({
                id: id,
                name: files.name,
                path: files.path,
                feedbackId: feedbackId,
            });
        }
    }
    res.send({
        message: "Success",
    });
}

export const feedbacksTemplate = (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        next();
        return;
    }
    
    res.sendFile(path.dirname(__dirname) + "/templates/feedbacks.html");
};

export const getFeedbacks = async (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        next();
        return;
    }

    const feedbacks = await Feedback.findAll().then(feedbacks => Promise.all(feedbacks.map(feedback => ({
        id: feedback.dataValues.id,
        title: feedback.dataValues.title,
        contact: feedback.dataValues.contact,
        message: feedback.dataValues.body,
    })).map(async feedback => {
        const files = await File.findAll({
            where: { feedbackId: feedback.id },
        }).then(files => files.map(file => {
            const mimeType = mime.lookup(file.dataValues.path);
            const isImage = mimeType && mimeType.startsWith('image/');

            return {
                id: file.dataValues.id,
                name: file.dataValues.name,
                isImage: isImage,
            };
        }));

        return {
            ...feedback,
            files: files,
        };
    })));

    res.send({
        feedbacks: feedbacks,
    });
};

export const feedbackFile = (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        next();
        return;
    }

    const { id } = req.query;
    if (typeof id !== 'string') {
        res.status(400).send({
            message: "No ID specified",
        });
        return;
    }

    File.findOne({
        where: { id: id as string },
    }).then(file => {
        if (file === null) {
            res.status(404).send({
                message: "Not found",
            });
            return;
        }

        res.sendFile(file.dataValues.path);
    })
}
