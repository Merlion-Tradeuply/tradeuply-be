import { Router } from "express";

import { clientRouter } from "./client.routes.js";
import { clientManagementRouter } from "./client-management.routes.js";
import { currencyRouter } from "./currency.routes.js";
import { healthRouter } from "./health.routes.js";
import { internalRouter } from "./internal.routes.js";
import { investmentPlanRouter } from "./investment-plan.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { depositRouter } from "./deposit.routes.js";
import { paymentMethodRouter } from "./payment-method.routes.js";
import { transactionRouter } from "./transaction.routes.js";

export const apiRouter = Router();

apiRouter.use("/client", clientRouter);
apiRouter.use("/clients", clientManagementRouter);
apiRouter.use("/currency", currencyRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/deposits", depositRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/internal", internalRouter);
apiRouter.use("/investment-plans", investmentPlanRouter);
apiRouter.use("/payment-methods", paymentMethodRouter);
apiRouter.use("/transactions", transactionRouter);
