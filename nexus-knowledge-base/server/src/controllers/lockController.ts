import { Response } from 'express';
import {
  AuthenticatedRequest,
  asyncHandler,
  validateUUID,
} from '../middleware';
import { lockService } from '../services';

/**
 * Lock Controller
 * 
 * Handles HTTP requests for article lock operations.
 */
export const lockController = {
  /**
   * Acquire a lock on an article
   * POST /api/articles/:id/lock
   */
  acquire: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const result = await lockService.acquireLock(req.params.id, req.user);
      
      if (result.success) {
        res.json({
          message: result.message,
          data: result.lock,
        });
      } else {
        res.status(409).json({
          error: {
            code: 'LOCK_CONFLICT',
            message: result.message,
            data: result.lock,
          },
        });
      }
    }),
  ],

  /**
   * Release a lock on an article
   * DELETE /api/articles/:id/lock
   */
  release: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const released = await lockService.releaseLock(req.params.id, req.user);
      
      if (released) {
        res.json({
          message: 'Lock released successfully',
        });
      } else {
        res.status(400).json({
          error: {
            code: 'LOCK_RELEASE_FAILED',
            message: 'Failed to release lock',
          },
        });
      }
    }),
  ],

  /**
   * Get lock status for an article
   * GET /api/articles/:id/lock
   */
  status: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const status = await lockService.getLockStatus(req.params.id, req.user);
      
      res.json({
        data: status,
      });
    }),
  ],

  /**
   * Renew an existing lock
   * PUT /api/articles/:id/lock
   */
  renew: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const result = await lockService.renewLock(req.params.id, req.user);
      
      if (result.success) {
        res.json({
          message: 'Lock renewed successfully',
          data: result.lock,
        });
      } else {
        res.status(409).json({
          error: {
            code: 'LOCK_RENEW_FAILED',
            message: result.message,
          },
        });
      }
    }),
  ],
};
