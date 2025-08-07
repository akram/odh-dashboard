import { registerProxy } from '../../../../utils/proxy';
import { KubeFastifyInstance } from '../../../../types';

export default async function (fastify: KubeFastifyInstance): Promise<void> {
  fastify.log.info('Loading RAG proxy route');
  await registerProxy(fastify, {
    prefix: '/rag',
    rewritePrefix: '/rag',
    service: {
      name: 'rag-bff-service',
      namespace: process.env.OC_PROJECT || 'default',
      port: 8080,
    },
    local: {
      host: 'localhost',
      port: 8080,
    },
    tls: false,
    authorize: false,
  });
  fastify.log.info('RAG proxy route loaded successfully');
} 