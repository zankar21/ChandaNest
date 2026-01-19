type LogLevel = "info" | "warn" | "error" | "debug";

type LogMethod = (message?: unknown, ...optionalParams: unknown[]) => void;

const createLogger = (level: LogLevel, writer: LogMethod): LogMethod => {
  return (message?: unknown, ...optionalParams: unknown[]) => {
    writer(`[${level}]`, message, ...optionalParams);
  };
};

export const logger = {
  info: createLogger("info", console.log),
  warn: createLogger("warn", console.warn),
  error: createLogger("error", console.error),
  debug: createLogger("debug", console.debug)
};
