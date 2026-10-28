import { useState, useMemo, useRef, MouseEvent, KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '../../../hooks/useLanguage'
import { API_BASE_URL } from '../../../config'

export interface IRegionStats {
  id: string
  name: string
  percentage: number
  hasCertificate: boolean
}

export interface IGisData {
  regions: Record<string, IRegionStats>
  globalFullStack: boolean
}

export interface ITooltipState {
  visible: boolean
  x: number
  y: number
  activeRegionId: string | null
  isMobileModal: boolean
  isHoveredByMouse: boolean
}

export const continentCenters = [
  { id: 'north_america', coordinates: [-100, 45], name: 'North America' },
  { id: 'south_america', coordinates: [-60, -20], name: 'South America' },
  { id: 'europe', coordinates: [20, 50], name: 'Europe' },
  { id: 'africa', coordinates: [20, 10], name: 'Africa' },
  { id: 'asia', coordinates: [100, 45], name: 'Asia' },
  { id: 'australia_oceania', coordinates: [135, -25], name: 'Oceania' },
]

export function useWorldMap() {
  const { t } = useLanguage()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false)

  const [tooltip, setTooltip] = useState<ITooltipState>({
    visible: false,
    x: 0,
    y: 0,
    activeRegionId: null,
    isMobileModal: false,
    isHoveredByMouse: false,
  })

  const {
    data: gisData,
    isLoading,
    isError,
  } = useQuery<IGisData>({
    queryKey: ['geo-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/progress/geo-stats`)
      if (!res.ok) throw new Error('GIS Link Offline')
      return res.json()
    },
  })

  const trackingMetrics = useMemo(() => {
    if (!gisData || !gisData.regions)
      return { earned: 0, blurValue: 8, opacityValue: 0.1 }
    const totalCerts = Object.values(gisData.regions).filter(
      (r) => r.hasCertificate,
    ).length
    const blurValue = Math.max(0, 8 - totalCerts * 1.15)
    const opacityValue = Math.min(1, 0.1 + totalCerts * 0.13)
    return { earned: totalCerts, blurValue, opacityValue }
  }, [gisData])

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (
      !mapContainerRef.current ||
      tooltip.isMobileModal ||
      !tooltip.isHoveredByMouse
    )
      return
    const bounds = mapContainerRef.current.getBoundingClientRect()
    const relativeX = e.clientX - bounds.left
    const relativeY = e.clientY - bounds.top
    const offsetY = relativeY > bounds.height / 2 ? -75 : 12

    setTooltip((prev) => ({
      ...prev,
      x: relativeX + 12,
      y: relativeY + offsetY,
    }))
  }

  const handleRegionLeave = () => {
    if (tooltip.isMobileModal) return
    setTooltip((prev) => ({
      ...prev,
      visible: false,
      activeRegionId: null,
      isHoveredByMouse: false,
    }))
  }

  const handleRegionTrigger = (regionId: string, e?: any) => {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation()
      if (typeof e.preventDefault === 'function') e.preventDefault()
    }

    const isKeyboardFocus =
      e && e.type === 'focus' && (!e.pointerType || e.pointerType === '')
    const isDesktop = window.innerWidth >= 1280
    const isMouseEnter = e && e.type === 'mouseenter'
    const shouldUseMobileModal =
      e &&
      (e.pointerType === 'touch' ||
        (e.type === 'click' && !isDesktop) ||
        (!isDesktop && isKeyboardFocus) ||
        window.innerWidth < 1280)

    if (shouldUseMobileModal) {
      setTooltip({
        visible: true,
        x: 0,
        y: 0,
        activeRegionId: regionId,
        isMobileModal: true,
        isHoveredByMouse: false,
      })
    } else {
      const targetCenter = continentCenters.find((c) => c.id === regionId)
      let keyboardX = 20
      let keyboardY = 50

      if (targetCenter) {
        const long = targetCenter.coordinates[0]
        const lat = targetCenter.coordinates[1]
        keyboardX = 400 + long * 2.2
        keyboardY = 185 - lat * 1.8
      }

      setTooltip((prev) => ({
        visible: true,
        x: isKeyboardFocus ? keyboardX : prev.x,
        y: isKeyboardFocus ? keyboardY : prev.y,
        activeRegionId: regionId,
        isMobileModal: false,
        isHoveredByMouse: isMouseEnter
          ? true
          : isKeyboardFocus
            ? false
            : prev.isHoveredByMouse,
      }))
    }
  }

  const handleKeyDown = (
    regionId: string,
    e: KeyboardEvent<SVGPathElement>,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleRegionTrigger(regionId, e)
    }
  }

  const closeTooltip = () => {
    setTooltip({
      visible: false,
      x: 0,
      y: 0,
      activeRegionId: null,
      isMobileModal: false,
      isHoveredByMouse: false,
    })
  }

  return {
    t,
    mapContainerRef,
    isLegendOpen,
    setIsLegendOpen,
    tooltip,
    gisData,
    isLoading,
    isError,
    trackingMetrics,
    handleMouseMove,
    handleRegionLeave,
    handleRegionTrigger,
    handleKeyDown,
    closeTooltip,
  }
}
