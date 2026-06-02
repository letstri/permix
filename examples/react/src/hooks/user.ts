import { useEffect, useState } from 'react'

export interface User {
  id: string
  name: string
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Simulate a network request
    // eslint-disable-next-line react/web-api-no-leaked-timeout
    new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
      setUser({
        id: Math.random() < 0.5 ? '1' : '2',
        name: 'John Doe',
      })
    })
  }, [])

  return user
}
