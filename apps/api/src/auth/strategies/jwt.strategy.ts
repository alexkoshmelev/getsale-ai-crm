import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Get organization member if organizationId is in payload
    let role = null;
    if (payload.organizationId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId: payload.organizationId,
        },
      });
      role = member?.role || null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: payload.organizationId || null,
      role,
    };
  }
}

