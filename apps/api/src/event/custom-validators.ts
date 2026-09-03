
import { Licence } from '@repo/types';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isGeoRequired', async: false })
export class IsGeoRequired implements ValidatorConstraintInterface {
    validate(value: any, args: ValidationArguments) {
        const object = args.object as any;
        if (object.licence === Licence.GEOTIME) {
            return value !== undefined && value !== null;
        }
        return true;
    }

    defaultMessage(args: ValidationArguments) {
        const property = args.property;
        return `${property} is required when licence is GEOTIME`;
    }
}