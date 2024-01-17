import { Router } from "express";
import { timezoneData, usageData, userData } from "./view";

const dashboardRouter = Router();
dashboardRouter.use('/user', userData);
dashboardRouter.use('/timezone', timezoneData);
dashboardRouter.use('/usage', usageData);

export default dashboardRouter;
