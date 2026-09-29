import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import farmRouter from "./farm";
import dashboardRouter from "./dashboard";
import advisoryRouter from "./advisory";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(farmRouter);
router.use(dashboardRouter);
router.use(advisoryRouter);
router.use(storageRouter);

export default router;
