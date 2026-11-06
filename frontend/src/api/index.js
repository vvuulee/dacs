import { env } from '../config/env';
import { httpAdapter } from './adapters/httpAdapter';
import { mockAdapter } from './adapters/mockAdapter';

export const adapter = env.apiMode === 'http' ? httpAdapter : mockAdapter;
