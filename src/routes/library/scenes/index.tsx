import { createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute('/library/scenes/')({
  loader: () => {
    throw notFound();
  },
  component: () => null,
});
