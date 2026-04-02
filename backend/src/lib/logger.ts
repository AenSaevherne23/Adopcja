import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    // 1. Zapisuj wszystkie błędy do pliku error.log
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // 2. Zapisuj wszystkie logi (info, warn, error) do pliku combined.log
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});


export default logger;