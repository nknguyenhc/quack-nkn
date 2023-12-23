import { Router } from "express";
import { authenticateUser, logoutUser } from "./view";

const adminRouter = Router();
adminRouter.post('/login', authenticateUser);
adminRouter.get('/logout', logoutUser);

export default adminRouter;
