"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const logger_1 = require("../utils/logger");
// Basic Express error handler to surface consistent JSON errors
function errorMiddleware(err, _req, res, _next) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = err?.message ?? "Internal Server Error";
    logger_1.logger.error("Unhandled error", err);
    res.status(status).json({ message });
}
