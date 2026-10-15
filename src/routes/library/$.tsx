import { createFileRoute } from '@tanstack/react-router';

import { redirectFromLibrary } from './-redirects';

export const Route = createFileRoute('/library/$')({
  beforeLoad: ({ params }) => redirectFromLibrary(params._splat ?? ''),
});
