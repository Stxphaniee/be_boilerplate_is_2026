import { Module } from '@nestjs/common';

import { ReportsController } from './controllers/reports.controller.js';
import { ReportsService } from './services/reports.service.js';

import { GeneralReportController } from './controllers/general-report.controller.js';
import { GeneralReportService } from './services/general-report.service.js';

@Module({
  controllers: [
    ReportsController,
    GeneralReportController,
  ],
  providers: [
    ReportsService,
    GeneralReportService,
  ],
  exports: [
    ReportsService,
    GeneralReportService,
  ],
})
export class ReportsModule {}
