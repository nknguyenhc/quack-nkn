import { Router } from "express";
import { authenticateUser, getCurrentUser, logoutUser } from "./view";

const adminRouter = Router();
adminRouter.post('/login', authenticateUser);
adminRouter.get('/logout', logoutUser);
adminRouter.get('/current-user', getCurrentUser);

export default adminRouter;
