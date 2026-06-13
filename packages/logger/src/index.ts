import winston from 'winston';

export function createLogger(service: string) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    defaultMeta: { service },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service: svc, ...meta }) => {
              const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${svc}] ${level}: ${message}${extra}`;
            })
          )
    ),
    transports: [new winston.transports.Console()],
  });
}

export type Logger = ReturnType<typeof createLogger>;
