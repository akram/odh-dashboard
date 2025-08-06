import type { Extension } from '@openshift/dynamic-plugin-sdk';
import odhExtensions from './odh';

const extensions: Extension[] = [...odhExtensions];

export default extensions;
