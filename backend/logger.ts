import * as winston from 'winston';
const { combine, timestamp, errors, json } = winston.format;

let loggerInstance: winston.Logger;

/**
 * better to use an actual logger than print statements
 * @returns logger
 */
export function getLogger(): winston.Logger {
    if (!loggerInstance) {
        loggerInstance = winston.createLogger({
            level: 'INFO', // Change this to DEBUG for debug statements
            format: combine(timestamp(), errors({ stack: true }), json()),
            transports: [new winston.transports.Console()],
        });
    }
    return loggerInstance;
}

export const logger = getLogger();
