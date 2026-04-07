import type { CmsAuthVerifyFn } from '../../src/runtime/types'

/**
 * Example custom auth handler for the playground.
 * Accepts username: "admin" and password: "password".
 * Returns a user object on success, null on failure.
 */
const verify: CmsAuthVerifyFn = async (_event, credentials) => {
  console.log("creds", credentials)
  const { username, password } = credentials

  // Simple hardcoded credentials for demo purposes
  if (username === 'admin' && password === 'password') {
    return {
      id: 1,
      name: 'Admin User',
      username: 'admin',
      role: 'admin',
    }
  }

  // Return null to indicate authentication failure (401)
  return null
}

export default verify
