import { env } from '../config/env'

export function mediaUrl(key: string) {
  return env.CDN_URL ? `${env.CDN_URL}/${key}` : null
}
