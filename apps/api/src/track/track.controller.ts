import { Controller, Get, Headers, HttpStatus, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation } from '@nestjs/swagger';
import { TrackService } from './track.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserWithProfile } from '@repo/types';

@Controller('track')
export class TrackController {

  constructor(
    private readonly trackService: TrackService
  ) { }

  // Unauthenticated today (pre-existing behaviour, not something this pass
  // changes) — kept public rather than silently locking it down.
  @Public()
  @Get('stream/:id')
  async getAudioStream(
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.trackService.getAudioStream(id, range);
    if (result.kind === 'redirect') {
      return res.redirect(result.url);
    }

    res.set('Accept-Ranges', 'bytes');

    if (result.range) {
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.set('Content-Range', `bytes ${result.range.start}-${result.range.end}/${result.totalSize}`);
      res.set('Content-Length', String(result.range.end - result.range.start + 1));
    } else {
      res.set('Content-Length', String(result.totalSize));
    }

    return result.file;
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for tracks' })
  searchTracks(@Query('query') query: string, @CurrentUser() user: UserWithProfile) {
    return this.trackService.searchTracks(query, user);
  }

  // Unauthenticated today (pre-existing behaviour, not something this pass
  // changes) — kept public rather than silently locking it down.
  @Public()
  @Get('tracks')
  @ApiOperation({ summary: 'Get all tracks' })
  getTracks() {
    return this.trackService.getAllTracks();
  }

  @Public()
  @Get('track/:id')
  @ApiOperation({ summary: 'Get a track by ID' })
  getTrackById() {
    // Logic to get a track by ID
  }
}
