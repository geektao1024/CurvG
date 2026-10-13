import { createFileRoute } from '@tanstack/react-router';

import { subjectRouteOptions } from './-subject-page';

export const Route = createFileRoute('/labs/physics')(
  subjectRouteOptions('physics')
);
