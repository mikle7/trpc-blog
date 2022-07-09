import { createRouter } from '../createRouter'
import {
  createPostSchema,
  getSinglePostSchema,
} from '../../schema/posts.schema'
import * as trpc from '@trpc/server'

export const postRouter = createRouter()
  .mutation('create-post', {
    input: createPostSchema,
    async resolve({ ctx, input }) {
      if (!ctx.user) {
        new trpc.TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Cannot create post while logged out',
        })
      }
      const post = await ctx.prisma.post.create({
        data: {
          ...input,
          user: {
            connect: {
              id: ctx?.user?.id,
            },
          },
        },
      })

      return post
    },
  })
  .query('posts', {
    resolve({ ctx }) {
      return ctx.prisma.post.findMany()
    },
  })
  .query('single-post', {
    input: getSinglePostSchema,
    resolve({ input, ctx }) {
      return ctx.prisma.post.findUnique({
        where: {
          id: input.postId,
        },
      })
    },
  })
