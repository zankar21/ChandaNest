"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/firebase");
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const port = env_1.env.port;
app_1.app.listen(port, () => {
    logger_1.logger.info(`Server listening on port ${port}`);
});
