import { Request } from "express";

interface File {
    fieldName: string,
    originalFilename: string,
    path: string,
    headers: {
        'content-disposition': string,
        'content-type': string,
    },
    size: number,
    name: string,
    type: string,
};

export interface CustomRequest extends Request {
    user?: {
        username: string,
    },
    files: {
        files?: File | Array<File>,
    },
}
