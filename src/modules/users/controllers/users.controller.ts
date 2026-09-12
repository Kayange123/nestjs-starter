import { UserAccessGuard } from '../../auth/guards/user-access.guard';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { UsersService } from '../services/users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserEnvelopeDto,
} from '../dto/user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserQueryDto } from '../dto/user-query.dto';
import { PaginatedUsersResponseDto } from '../dto/paginated-users-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('Admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created',
    type: UserEnvelopeDto,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return new UserResponseDto(await this.usersService.create(createUserDto));
  }

  @Get()
  @Roles('Admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List users with bounded pagination' })
  @ApiResponse({
    status: 200,
    description: 'Return a filtered page of users',
    type: PaginatedUsersResponseDto,
  })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return user by ID',
    type: UserEnvelopeDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return new UserResponseDto(await this.usersService.findById(id));
  }

  @Patch(':id')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'User updated',
    type: UserEnvelopeDto,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return new UserResponseDto(
      await this.usersService.update(id, updateUserDto),
    );
  }

  @Delete(':id')
  @Roles('Admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
