"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const createLogger = (level, writer) => {
    return (message, ...optionalParams) => {
        writer(`[${level}]`, message, ...optionalParams);
    };
};
exports.logger = {
    info: createLogger("info", console.log),
    warn: createLogger("warn", console.warn),
    error: createLogger("error", console.error),
    debug: createLogger("debug", console.debug)
};
