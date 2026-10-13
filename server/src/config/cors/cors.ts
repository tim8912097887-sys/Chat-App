import { type CorsOptions } from 'cors';
import { type Request } from 'express';
import { config } from '../env/index.js';

export const corsConfig = (
  _req: Request,
  callback: (error: Error | null, options?: Partial<CorsOptions>) => void,
) => {
  const corsOptions: Partial<CorsOptions> = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  corsOptions.origin = config.cors.origins;
  callback(null, corsOptions);
};
