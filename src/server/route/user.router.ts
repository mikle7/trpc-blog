import { createRouter } from '../createRouter'
import {
  createUserSchema,
  createUserOutputSchema,
} from '../../schema/user.schema'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime'
import * as trpc from '@trpc/server'
import { requestOtpSchema, verifyOtpSchema } from '../../schema/user.schema'
import { sendLoginEmail } from '../../utils/mailer'
import { baseUrl } from '../../constants'
import { encode, decode } from '../../utils/base64'
import { signJwt } from '../../utils/jwt'
import { serialize } from 'cookie'
export const userRouter = createRouter()
  .mutation('register-user', {
    // This is where zod will infer the types from and when we call the mutation we will get type validation
    input: createUserSchema,
    resolve: async ({ ctx, input }) => {
      // Inferred from zod schema
      const { name, email } = input
      try {
        const user = await ctx.prisma.user.create({
          data: {
            name,
            email,
          },
        })
        return user
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
          // Because we've ensured that the error is of type PrimsaClientKnownRequestError we get typed properties
          if (error.code === 'P2002') {
            throw new trpc.TRPCError({
              code: 'CONFLICT',
              message: 'User already exists',
            })
          }

          throw new trpc.TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
          })
        }
      }
    },
  })
  .mutation('request-otp', {
    input: requestOtpSchema,
    async resolve({ input, ctx }) {
      const { email, redirect } = input

      const user = await ctx.prisma.user.findUnique({
        where: {
          email,
        },
      })

      if (!user) {
        throw new trpc.TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      const token = await ctx.prisma.loginToken.create({
        data: {
          redirect,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      })

      sendLoginEmail({
        token: encode(`${token.id}:${user.email}`),
        url: baseUrl,
        email: user.email,
      })
      return true
    },
  })
  .query('verify-otp', {
    input: verifyOtpSchema,
    async resolve({ input, ctx }) {
      const decoded = decode(input.hash).split(':')
      const [id, email] = decoded
      const token = await ctx.prisma.loginToken.findFirst({
        where: {
          id,
          user: {
            email,
          },
        },
        include: {
          user: true,
        },
      })

      if (!token) {
        throw new trpc.TRPCError({
          code: 'FORBIDDEN',
          message: 'Invalid token',
        })
      }

      const jwt = signJwt({
        email: token.user.email,
        id: token.user.id,
      })

      ctx.res.setHeader('Set-Cookie', serialize('token', jwt, { path: '/' }))

      return {
        redirect: token.redirect,
      }
    },
  })
  .query('me', {
    resolve({ ctx }) {
      return ctx.user
    },
  })
