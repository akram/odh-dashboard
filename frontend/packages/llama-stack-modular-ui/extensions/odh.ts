import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const PLUGIN_RAG_PLAYGROUND = 'plugin-rag-playground';

const extensions: (
  | AreaExtension
  | HrefNavItemExtension
  | RouteExtension
)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_RAG_PLAYGROUND,
      reliantAreas: [SupportedArea.MODEL_SERVING],
      devFlags: ['RAG Playground Plugin'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.LLAMA_STACK_CHAT_BOT],
    },
    properties: {
      id: 'ragPlayground',
      title: 'RAG Playground',
      href: '/ragPlayground',
      section: 'models',
      path: '/ragPlayground/*',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/ragPlayground/*',
      component: () => import('../frontend/src/app/Chatbot/ChatbotMain').then((m) => ({ default: m.ChatbotMain })),
    },
    flags: {
      required: [SupportedArea.LLAMA_STACK_CHAT_BOT],
    },
  },
];

export default extensions;
