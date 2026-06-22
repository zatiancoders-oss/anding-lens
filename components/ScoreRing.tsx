'use client'

import { useEffect, useRef } from 'react'
import styles from './ScoreRing.module.css'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
}

function getScoreColor(score: number) {
  if (score >= 70) return ['#22C55E', '#16A34A']
  if (score >= 40) return ['#F59E0B', '#D97706']
  return ['#EF4444', '#DC2626']
}

export default function ScoreRing({ score, size = 140, strokeWidth = 10 }: ScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null)
  const [colorStart, colorStop] = getScoreColor(score)
  
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const gradientId = `scoreGrad-${score}`

  useEffect(() => {
    if (!circleRef.current) return
    circleRef.current.style.strokeDashoffset = circumference.toString()
    
    requestAnimationFrame(() => {
      if (!circleRef.current) return
      circleRef.current.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
      circleRef.current.style.strokeDashoffset = offset.toString()
    })
  }, [score, offset, circumference])

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorStop} />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
      </svg>

      {/* Score Number */}
      <div className={styles.scoreText}>
        <span className={styles.scoreNum} style={{ color: colorStart }}>
          {score}
        </span>
        <span className={styles.scoreSlash}>/100</span>
      </div>
    </div>
  )
}
