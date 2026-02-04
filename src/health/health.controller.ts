import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiExcludeController } from '@nestjs/swagger';
import { routeNames } from 'src/common/constants/routes.constants';

@ApiExcludeController()
@Controller(routeNames.Health.Name)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  liveness() {
    return this.healthService.getLivenessInfo();
  }
}
