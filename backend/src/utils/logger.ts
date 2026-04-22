import * as winston from "winston";
import readConfig from "./config";
const { combine, timestamp, errors, json } = winston.format;

let loggerInstance: winston.Logger;

export function getLogger(): winston.Logger {
  if (!loggerInstance) {
    const config = readConfig();
    const correlation = winston.format((info) => {
      const span = (global as any).__correlationId as string | undefined;
      if (span) info.correlationId = span;
      return info;
    });

    console.log(`Winston log level: ${config.LOG_LEVEL}`);
    loggerInstance = winston.createLogger({
      level: config.LOG_LEVEL,
      format: combine(
        timestamp(),
        errors({ stack: true }),
        correlation(),
        json(),
      ),
      transports: [new winston.transports.Console()],
    });
  }
  return loggerInstance;
}

export const logger = getLogger();
