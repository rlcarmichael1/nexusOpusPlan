import { Request, Response, NextFunction } from 'express';
import { BadRequestError, ValidationError } from '../utils';

/**
 * Validation schemas for different request types
 */
interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: unknown[];
    items?: ValidationSchema;
    properties?: ValidationSchema;
  };
}

/**
 * Validate request body against a schema
 */
function validateObject(
  data: Record<string, unknown>,
  schema: ValidationSchema,
  prefix: string = ''
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const fieldPath = prefix ? `${prefix}.${field}` : field;
    const value = data[field];
    const fieldErrors: string[] = [];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      fieldErrors.push(`${fieldPath} is required`);
      errors[fieldPath] = fieldErrors;
      continue;
    }

    // Skip optional fields that are not provided
    if (value === undefined || value === null) {
      continue;
    }

    // Type check
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          fieldErrors.push(`${fieldPath} must be a string`);
        } else {
          if (rules.minLength && value.length < rules.minLength) {
            fieldErrors.push(`${fieldPath} must be at least ${rules.minLength} characters`);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            fieldErrors.push(`${fieldPath} must not exceed ${rules.maxLength} characters`);
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            fieldErrors.push(`${fieldPath} format is invalid`);
          }
          if (rules.enum && !rules.enum.includes(value)) {
            fieldErrors.push(`${fieldPath} must be one of: ${rules.enum.join(', ')}`);
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          fieldErrors.push(`${fieldPath} must be a number`);
        } else {
          if (rules.min !== undefined && value < rules.min) {
            fieldErrors.push(`${fieldPath} must be at least ${rules.min}`);
          }
          if (rules.max !== undefined && value > rules.max) {
            fieldErrors.push(`${fieldPath} must not exceed ${rules.max}`);
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          fieldErrors.push(`${fieldPath} must be a boolean`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          fieldErrors.push(`${fieldPath} must be an array`);
        } else {
          if (rules.minLength && value.length < rules.minLength) {
            fieldErrors.push(`${fieldPath} must have at least ${rules.minLength} items`);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            fieldErrors.push(`${fieldPath} must not exceed ${rules.maxLength} items`);
          }
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          fieldErrors.push(`${fieldPath} must be an object`);
        } else if (rules.properties) {
          const nestedErrors = validateObject(
            value as Record<string, unknown>,
            rules.properties,
            fieldPath
          );
          Object.assign(errors, nestedErrors);
        }
        break;
    }

    if (fieldErrors.length > 0) {
      errors[fieldPath] = fieldErrors;
    }
  }

  return errors;
}

/**
 * Create validation middleware for request body
 */
export function validateBody(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== 'object') {
      throw new BadRequestError('Request body is required');
    }

    const errors = validateObject(req.body, schema);

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    next();
  };
}

/**
 * Create validation middleware for query parameters
 */
export function validateQuery(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Convert query params to appropriate types
    const query: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(req.query)) {
      if (schema[key]) {
        switch (schema[key].type) {
          case 'number':
            query[key] = value ? Number(value) : undefined;
            break;
          case 'boolean':
            query[key] = value === 'true' ? true : value === 'false' ? false : undefined;
            break;
          case 'array':
            query[key] = typeof value === 'string' ? value.split(',') : value;
            break;
          default:
            query[key] = value;
        }
      } else {
        query[key] = value;
      }
    }

    const errors = validateObject(query, schema);

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    // Update req.query with converted values
    req.query = query as typeof req.query;
    next();
  };
}

/**
 * Validate UUID format
 */
export function validateUUID(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!value || !uuidRegex.test(value)) {
      throw new BadRequestError(`Invalid ${paramName} format`);
    }

    next();
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  pagination: {
    page: { type: 'number' as const, min: 1 },
    limit: { type: 'number' as const, min: 1, max: 100 },
  },
  
  sorting: {
    sortBy: { 
      type: 'string' as const, 
      enum: ['createdAt', 'updatedAt', 'briefTitle', 'viewCount'] 
    },
    sortOrder: { 
      type: 'string' as const, 
      enum: ['asc', 'desc'] 
    },
  },
};
