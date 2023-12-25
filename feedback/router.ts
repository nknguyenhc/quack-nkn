import { Router } from "express";
import { postFeedbackForm } from "./view";

const feedbackRouter = Router();
feedbackRouter.post('/submit', postFeedbackForm);

export default feedbackRouter;
