import { Module } from '@nestjs/common';
import { GeneralReportController } from './controllers/general-report.controller.js';
import { GeneralReportService } from './services/general-report.service.js';

@Module({
  controllers: [GeneralReportController],
  providers: [GeneralReportService],
  exports: [GeneralReportService],
})
export class ReportsModule {}
