import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize } = format;

// Custom format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Use file transports only when explicitly enabled or in development
const shouldUseFileTransports =
  process.env.ENABLE_FILE_LOGS === "true" ||
  process.env.NODE_ENV === "development";

const consoleTransport = new transports.Console({
  format: combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
});

const baseTransports: Array<
  transports.ConsoleTransportInstance | transports.FileTransportInstance
> = [consoleTransport];

if (shouldUseFileTransports) {
  baseTransports.push(
    new transports.File({
      filename: "logs/error.log",
      level: "error",
      format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
    }),
    new transports.File({
      filename: "logs/combined.log",
      format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
    })
  );
}

// Create logger
export const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
  transports: baseTransports,
});

// Create a stream object for Morgan
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};