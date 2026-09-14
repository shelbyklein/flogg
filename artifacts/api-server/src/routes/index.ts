import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import logsRouter from "./logs";
import filamentsRouter from "./filaments";
import printersRouter from "./printers";
import adminRouter from "./admin";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(filamentsRouter);
router.use(printersRouter);
router.use(logsRouter);
router.use(adminRouter);
router.use(storageRouter);

export default router;
