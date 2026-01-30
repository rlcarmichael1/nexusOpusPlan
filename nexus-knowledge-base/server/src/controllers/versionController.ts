import { Response } from 'express';
import {
  AuthenticatedRequest,
  asyncHandler,
  validateUUID,
  validateQuery,
} from '../middleware';
import { versionService } from '../services';

/**
 * Version Controller
 * 
 * Handles HTTP requests for article version history operations.
 */
export const versionController = {
  /**
   * Get version history for an article
   * GET /api/articles/:id/versions
   */
  list: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const versions = await versionService.getVersions(req.params.id, req.user);
      
      res.json({
        data: versions,
      });
    }),
  ],

  /**
   * Get a specific version
   * GET /api/articles/:id/versions/:version
   */
  get: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const versionNumber = parseInt(req.params.version, 10);
      
      if (isNaN(versionNumber) || versionNumber < 1) {
        res.status(400).json({
          error: {
            code: 'INVALID_VERSION',
            message: 'Version number must be a positive integer',
          },
        });
        return;
      }

      const version = await versionService.getVersion(
        req.params.id,
        versionNumber,
        req.user
      );
      
      res.json({
        data: version,
      });
    }),
  ],

  /**
   * Compare two versions
   * GET /api/articles/:id/versions/compare
   */
  compare: [
    validateUUID('id'),
    validateQuery({
      v1: { type: 'number', required: true, min: 1 },
      v2: { type: 'number', required: true, min: 1 },
    }),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const v1 = parseInt(req.query.v1 as string, 10);
      const v2 = parseInt(req.query.v2 as string, 10);

      const comparison = await versionService.compareVersions(
        req.params.id,
        v1,
        v2,
        req.user
      );
      
      res.json({
        data: comparison,
      });
    }),
  ],

  /**
   * Restore an article to a previous version
   * POST /api/articles/:id/versions/:version/restore
   */
  restore: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const versionNumber = parseInt(req.params.version, 10);
      
      if (isNaN(versionNumber) || versionNumber < 1) {
        res.status(400).json({
          error: {
            code: 'INVALID_VERSION',
            message: 'Version number must be a positive integer',
          },
        });
        return;
      }

      const version = await versionService.restoreVersion(
        req.params.id,
        versionNumber,
        req.user
      );
      
      res.json({
        message: `Article restored to version ${versionNumber}`,
        data: version,
      });
    }),
  ],
};
