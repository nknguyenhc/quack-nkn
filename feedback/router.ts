import { Router } from "express";
import { feedbackFile, feedbacksTemplate, getFeedbacks, postFeedbackForm } from "./view";

const feedbackRouter = Router();
feedbackRouter.post('/submit', postFeedbackForm);
feedbackRouter.get('/all', feedbacksTemplate);
feedbackRouter.get('/get', getFeedbacks);
feedbackRouter.get('/file', feedbackFile);

export default feedbackRouter;
