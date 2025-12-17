import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = request.params.organizationId || request.body?.organizationId;

    if (!user?.organizationId) {
      throw new ForbiddenException('User must belong to an organization');
    }

    // Allow if accessing own organization
    if (organizationId && user.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied to this organization');
    }

    return true;
  }
}

