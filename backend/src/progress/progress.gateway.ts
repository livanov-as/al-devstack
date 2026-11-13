import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { CryptoService } from '../auth/crypto.service.js'

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'https://al-devstack.vercel.app',
    ],
    credentials: true,
  },
})
export class ProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(ProgressGateway.name)

  constructor(private readonly cryptoService: CryptoService) {}

  /**
   * Authenticates incoming WebSocket handshake via HttpOnly session cookie
   * and isolates the socket into a dedicated user-scoped room.
   */
  handleConnection(client: Socket) {
    const rawCookies = client.handshake.headers.cookie
    const token = this.extractSessionToken(rawCookies)

    if (!token) {
      this.logger.warn(`WS Access Denied: Missing session cookie on client ${client.id}.`)
      client.disconnect(true)
      return
    }

    const payload = this.cryptoService.verifyJwt(token)
    if (!payload || !payload.username) {
      this.logger.warn(`WS Access Denied: Invalid session signature on client ${client.id}.`)
      client.disconnect(true)
      return
    }

    const username = String(payload.username)
    const roomName = `user:${username}`

    client.data.username = username
    client.join(roomName)
    this.logger.log(`WS Connected: Client ${client.id} joined isolated room "${roomName}".`)
  }

  handleDisconnect(client: Socket) {
    if (client.data?.username) {
      this.logger.log(`WS Disconnected: Client ${client.id} left room "user:${client.data.username}".`)
    }
  }

  /**
   * Broadcasts telemetry_updated event to either a specific user room
   * or all connected telemetry sessions after scraper cache invalidation.
   */
  notifyTelemetryUpdated(targetUsername?: string) {
    const payload = {
      timestamp: new Date().toISOString(),
      targetUsername: targetUsername || 'ALL',
    }

    if (targetUsername) {
      const roomName = `user:${targetUsername}`
      this.server.to(roomName).emit('telemetry_updated', payload)
      this.logger.log(`📡 WS Event Emitted: "telemetry_updated" dispatched to room "${roomName}".`)
    } else {
      this.server.emit('telemetry_updated', payload)
      this.logger.log('📡 WS Event Emitted: "telemetry_updated" broadcasted across all active rooms.')
    }
  }

  private extractSessionToken(rawCookies?: string): string | null {
    if (!rawCookies) return null

    const cookies = rawCookies.split(';')
    for (const cookie of cookies) {
      const parts = cookie.split('=')
      const name = parts[0]?.trim()
      if (name === 'al_session') {
        return decodeURIComponent(parts.slice(1).join('='))
      }
    }

    return null
  }
}
