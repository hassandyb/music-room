import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetProfileResponseDto } from './dto/get-profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserWithProfile } from '@repo/types';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateProfileDto } from './dto/create-profile-dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import {
  ApiResponseDto,
  ApiResponseOf,
} from '../../common/dto/api-response.dto';
import { UserModule } from '../user/user.module';
import { AuditAction } from '../../common/decorators/audit-log.decorator';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  @AuditAction('PROFILE_CREATED')
  @ApiOperation({ summary: 'create user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
        location: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        genres: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiResponse({ type: ApiResponseOf(UserModule) })
  createProfile(
    @Body() createUserProfileDto: CreateProfileDto,
    @CurrentUser() user: UserWithProfile,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    avatar?: Express.Multer.File,
  ) {
    return this.profileService.createProfile(
      createUserProfileDto,
      user,
      avatar,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ type: ApiResponseOf(UserModule) })
  async getProfile(@CurrentUser() current_user: UserWithProfile) {
    const [stats, recentEvents, recentPlaylists] = await Promise.all([
      this.profileService.getProfileStats(current_user.id),
      this.profileService.getRecentEvents(current_user.id),
      this.profileService.getRecentPlaylists(current_user.id),
    ]);
    return { ...current_user, stats, recentEvents, recentPlaylists };
  }

  @Put()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @AuditAction('PROFILE_UPDATED')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        username: { type: 'string' },
        searchPreferences: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiResponse({ type: ApiResponseOf(UserModule) })
  updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: UserWithProfile,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    avatar?: Express.Multer.File,
  ) {
    return this.profileService.updateProfile(updateProfileDto, user, avatar);
  }

  @Patch('subscription')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
  @AuditAction('SUBSCRIPTION_UPDATED')
  @ApiOperation({ summary: 'Switch between Free and Premium subscription' })
  updateSubscription(
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: UserWithProfile,
  ) {
    return this.profileService.updateSubscription(user.id, dto.subscription);
  }
}
