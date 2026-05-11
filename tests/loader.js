import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as resolvePath, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function resolve(specifier, context, nextResolve) {
  if (specifier === 'https://esm.sh/@supabase/supabase-js@2') {
    const stubPath = resolvePath(__dirname, 'stubs/supabase.js');
    return { shortCircuit: true, url: pathToFileURL(stubPath).href };
  }
  return nextResolve(specifier, context);
}
