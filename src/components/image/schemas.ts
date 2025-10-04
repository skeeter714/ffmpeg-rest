import { createRoute, z } from '@hono/zod-openapi';
import { FileSchema, ErrorSchema } from '~/utils/schemas';

/**
 * POST /image/jpg - Convert any image format to JPG
 */
export const imageToJpgRoute = createRoute({
  method: 'post',
  path: '/image/jpg',
  tags: ['Image'],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: FileSchema
          })
        }
      },
      required: true
    }
  },
  responses: {
    200: {
      content: {
        'image/jpeg': {
          schema: FileSchema
        }
      },
      description: 'Image converted to JPG format'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Invalid image file or unsupported format'
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Conversion failed'
    },
    501: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Not implemented'
    }
  }
});
