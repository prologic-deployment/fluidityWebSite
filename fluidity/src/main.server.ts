import { bootstrapApplication } from '@angular/platform-browser';
import type { BootstrapContext } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

// The server bundle's default export must be a bootstrap function:
// the route extractor / renderer invokes it as `bootstrap({ platformRef })`.
export default async (context: BootstrapContext) =>
  bootstrapApplication(App, appConfig, context);
