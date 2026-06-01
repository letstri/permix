import { useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

function scrollActiveSidebarItem() {
  const viewport = document.querySelector(
    '#nd-sidebar [data-radix-scroll-area-viewport]',
  )
  const active = document.querySelector('#nd-sidebar [data-active="true"]')

  if (!viewport || !active) {
    return
  }

  const viewportRect = viewport.getBoundingClientRect()
  const activeRect = active.getBoundingClientRect()

  if (activeRect.top < viewportRect.top || activeRect.bottom > viewportRect.bottom) {
    active.scrollIntoView({ block: 'nearest' })
  }
}

export function SidebarScrollFix() {
  const pathname = useRouterState({ select: s => s.location.pathname })

  useEffect(() => {
    scrollActiveSidebarItem()

    const frame = requestAnimationFrame(scrollActiveSidebarItem)
    return () => cancelAnimationFrame(frame)
  }, [pathname])

  return null
}
