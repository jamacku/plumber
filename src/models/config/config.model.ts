import {
  IsNotEmpty,
  IsString,
  validate,
  ValidateNested,
  ValidationError,
} from 'class-validator';

import { PlumberConfig } from './rules/plumber.config';

import { ReleaseBranch } from './releaseBranch.model';
import { Rules } from './rules/rules.model';
import { Feedback } from '../feedback.model';
import { Validation } from '../../types/general';
import { ImplementsStatic } from '../../services/common.service';

@ImplementsStatic<Validation<Config>>()
export class Config {
  @IsNotEmpty({
    message: `Can't be empty.`,
  })
  @IsString({
    message: 'Is not a `string`',
  })
  readonly package?: string;

  @ValidateNested()
  readonly branches?: ReleaseBranch[];

  @ValidateNested()
  readonly rules?: Rules;

  constructor(private readonly config: PlumberConfig) {
    this.package = this.config?.package ?? '';
    this.branches = this.config.config?.map(
      record => new ReleaseBranch(record)
    );
    this.rules = new Rules(this.config.rules);
  }

  static validate(instance: Config) {
    let feedback = new Feedback();

    validate(instance).then(errors => {
      const results = errors.map(error => {
        return Config.composeFeedbackObject(error);
      });

      feedback.setConfigTemplate(results);
    });

    console.log(feedback.message);

    return feedback;
  }

  private static composeFeedbackObject(data: ValidationError) {
    if (!data.children?.length) {
      return {
        property: data.property,
        value: data.value,
        notes: data.constraints,
      };
    }

    return {
      property: Config.composeProperty(data),
      value: Config.composeValue(data, 'value'),
      notes: Config.composeValue(data, 'constraints'),
    };
  }

  private static composeProperty(data: ValidationError): string {
    return !data.children?.length
      ? `${data.property}`
      : `${data.property}.${data.children.map(item => {
          return Config.composeProperty(item);
        })}`;
  }

  private static composeValue<T extends keyof ValidationError>(
    data: ValidationError,
    name: T
  ): ValidationError[T] {
    return !data.children?.length
      ? data[name]
      : data.children.map(item => {
          return Config.composeValue(item, name);
        })[0];
  }
}