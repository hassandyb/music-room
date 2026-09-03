import { Controller, Get, Query } from "@nestjs/common";
import { UserService } from "./user.service";
import { ApiOperation, ApiProperty, ApiResponse } from "@nestjs/swagger";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { Public } from "../auth/decorators/public.decorator";



@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }


    // Unauthenticated today (pre-existing behaviour, not something this pass
    // changes) — kept public rather than silently locking it down.
    @Public()
    @Get('search')
    @ApiProperty({
        example: "find users with name 'aamhamdi'",
        description: "search for users by username, email or name"
    })
    @ApiResponse({ type: ApiResponseDto })
    @ApiOperation({ summary: 'Search users' })
    searchUsers(@Query('query') query: string) {
        return this.userService.searchUsers(query);
    }
}