import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

@Injectable()
export class ValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.#toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    if (!object) return value;

    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });

    if (errors.length > 0) {
      this.logger.debug(`Validation failed: ${JSON.stringify(errors)}`);
      throw new BadRequestException(this.#formatErrors(errors));
    }

    return object; // Return transformed object instead of original value
  }

  #toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object, Date, Map, Set];
    return !types.includes(metatype);
  }

  #formatErrors(errors: ValidationError[]): {
    message: string;
    details: Record<string, string[]>;
  } {
    const formattedErrors: Record<string, string[]> = {};

    const extractErrors = (errors: ValidationError[], parentKey = '') => {
      errors.forEach((error) => {
        const key = parentKey
          ? `${parentKey}.${error.property}`
          : error.property;

        if (error.constraints) {
          formattedErrors[key] = Object.values(error.constraints);
        }

        if (error.children?.length) {
          extractErrors(error.children, key);
        }
      });
    };

    extractErrors(errors);

    const firstErrorKey = Object.keys(formattedErrors)[0] || '';
    const firstErrorMessage =
      formattedErrors[firstErrorKey]?.[0] || 'Validation failed';

    return {
      message: firstErrorMessage,
      details: formattedErrors,
    };
  }
}
