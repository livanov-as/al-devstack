import { KeyboardEvent } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from '@vnedyalk0v/react19-simple-maps'
import * as d3Scale from 'd3-scale'
import geoData from '../../../assets/continents-optimized.json'
import TrophyMarker from '../../../components/TrophyMarker'
import { continentCenters, IGisData } from '../hooks/useWorldMap'

interface MapCanvasProps {
  gisData: IGisData
  trackingMetrics: {
    earned: number
    blurValue: number
    opacityValue: number
  }
  handleRegionTrigger: (regionId: string, e?: any) => void
  handleRegionLeave: () => void
  handleKeyDown: (regionId: string, e: KeyboardEvent<SVGPathElement>) => void
}

const colorScale = d3Scale
  .scaleLinear<string>()
  .domain([0, 30, 99, 100])
  .range(['#0f172a', '#047857', '#0d9488', '#10b981'])

const topoJsonIdMap: Record<string, string> = {
  Europe: 'europe',
  Asia: 'asia',
  Africa: 'africa',
  'North America': 'north_america',
  'South America': 'south_america',
  Oceania: 'australia_oceania',
  Australia: 'australia_oceania',
}

export default function MapCanvas({
  gisData,
  trackingMetrics,
  handleRegionTrigger,
  handleRegionLeave,
  handleKeyDown,
}: MapCanvasProps) {
  const { regions, globalFullStack } = gisData

  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={
        {
          scale: 140,
          center: [0, 0],
          translate: [400, 185],
        } as any
      }
      width={800}
      height={380}
      className="h-full w-full border-none ring-0 outline-none select-none focus:ring-0 focus:outline-none active:outline-none"
    >
      <g
        transform="translate(0, 20)"
        className="border-none ring-0 outline-none focus:outline-none"
      >
        <Geographies
          geography={geoData}
          className="border-none ring-0 outline-none focus:outline-none"
        >
          {({ geographies }) =>
            geographies.map((geo) => {
              const continentName =
                geo.properties.CONTINENT || geo.properties.name
              const regionId = topoJsonIdMap[continentName]
              const regionStats = regions[regionId]
              const percentage = regionStats
                ? regionStats.hasCertificate
                  ? 100
                  : regionStats.percentage
                : 0
              const geoColor = colorScale(percentage)

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(e: any) =>
                    regionId && handleRegionTrigger(regionId, e)
                  }
                  onMouseLeave={handleRegionLeave}
                  onClick={(e: any) =>
                    regionId && handleRegionTrigger(regionId, e)
                  }
                  onFocus={(e: any) =>
                    regionId && handleRegionTrigger(regionId, e)
                  }
                  onBlur={handleRegionLeave}
                  onKeyDown={(e: any) => regionId && handleKeyDown(regionId, e)}
                  tabIndex={regionId ? 0 : -1}
                  role="button"
                  className="focus:outline-none focus-visible:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] focus-visible:filter"
                  style={{
                    default: {
                      fill: geoColor,
                      stroke: '#1e293b',
                      strokeWidth: 0.5,
                      outline: 'none',
                      transition: 'all 250ms',
                    },
                    hover: {
                      fill: regionStats?.hasCertificate ? '#34d399' : '#0ea5e9',
                      stroke: '#64748b',
                      strokeWidth: 1,
                      outline: 'none',
                      cursor: 'crosshair',
                    },
                    pressed: {
                      fill: '#059669',
                      stroke: '#1e293b',
                      strokeWidth: 0.5,
                      outline: 'none',
                    },
                  }}
                />
              )
            })
          }
        </Geographies>

        <path
          d="M 170,290 C 175,285 185,285 190,292 C 195,298 188,308 180,305 C 172,302 165,295 170,290 Z"
          style={{
            fill: globalFullStack ? '#34d399' : '#10b981',
            stroke: globalFullStack ? '#6ee7b7' : '#047857',
            strokeWidth: 0.7,
            filter: `blur(${trackingMetrics.blurValue}px)`,
            opacity: trackingMetrics.opacityValue,
            transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          tabIndex={0}
          role="button"
          className={
            globalFullStack
              ? 'cursor-pointer transition-all duration-500 hover:drop-shadow-[0_0_12px_rgba(52,211,153,0.7)] focus:stroke-[#6ee7b7] focus:outline-none'
              : 'focus:stroke-[#047857] focus:outline-none'
          }
          onMouseEnter={(e) => handleRegionTrigger('secret_island', e)}
          onMouseLeave={handleRegionLeave}
          onClick={(e) => handleRegionTrigger('secret_island', e)}
          onFocus={(e) => handleRegionTrigger('secret_island', e)}
          onBlur={handleRegionLeave}
          onKeyDown={(e: any) => handleKeyDown('secret_island', e)}
        />

        {continentCenters.map((center) => {
          const targetRegion = regions[center.id]
          if (!targetRegion || !targetRegion.hasCertificate) return null
          return (
            <Marker key={center.id} coordinates={center.coordinates as any}>
              <TrophyMarker />
            </Marker>
          )
        })}
      </g>
    </ComposableMap>
  )
}
