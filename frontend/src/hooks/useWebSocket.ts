import { useEffect, useRef, useCallback, useState } from 'react'

type MessageHandler = (data: unknown) => void

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map())

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const token = localStorage.getItem('access_token')
    const wsUrl = token ? `${url}?token=${token}` : url

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const { type, data } = message
        const handler = handlersRef.current.get(type)
        if (handler) {
          handler(data)
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error', error)
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log('WebSocket disconnected')
      // Reconnect with exponential backoff
      setTimeout(() => connect(), Math.min(1000 * Math.random() * 2, 30000))
    }

    return ws
  }, [url])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    handlersRef.current.set(type, handler)
    return () => handlersRef.current.delete(type)
  }, [])

  useEffect(() => {
    const ws = connect()
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [connect])

  return {
    isConnected,
    connect,
    disconnect,
    subscribe,
  }
}