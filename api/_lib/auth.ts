import { createRemoteJWKSet, jwtVerify } from 'jose'
import { getServerEnv } from './env.js'

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null
  }

  const [scheme, token] = authorizationHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}

export interface VerifiedUser {
  userId: string
  subject: string
}

export const verifyRequestUser = async (req: {
  headers: {
    authorization?: string
  }
}): Promise<VerifiedUser> => {
  const token = getBearerToken(req.headers.authorization)
  if (!token) {
    throw new Error('UNAUTHORIZED')
  }

  const env = getServerEnv()
  const issuer = `https://${env.auth0Domain}/`
  const jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`))

  const verifyOptions = env.auth0Audience
    ? {
        issuer,
        audience: env.auth0Audience,
      }
    : {
        issuer,
      }

  let payload: { sub?: string }

  try {
    const verification = await jwtVerify(token, jwks, verifyOptions)
    payload = verification.payload
  } catch {
    throw new Error('UNAUTHORIZED')
  }

  const subject = payload.sub
  if (!subject) {
    throw new Error('UNAUTHORIZED')
  }

  return {
    userId: subject,
    subject,
  }
}
