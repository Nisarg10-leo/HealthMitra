import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateKey, formatWeekday } from '../../utils/format.js';
import { CheckIcon } from '../../components/ui/Icons.jsx';

export const weeklyAdherence = (logs, days = 7) =>
  Array.from({ length: days }, (_, index) =>
    dateKey(Date.now() - (days - 1 - index) * 86400000)
  ).map((day) => {
    const dayLogs = logs.filter((log) => log.scheduledTime.startsWith(day));
    const takenCount = dayLogs.filter((log) => log.status === 'taken').length;
    return {
      day,
      total: dayLogs.length,
      taken: takenCount,
      score: dayLogs.length ? Math.round((100 * takenCount) / dayLogs.length) : 0
    };
  });

export function AdherenceChart({ logs = [] }) {
  const { t, i18n } = useTranslation();
  const data = weeklyAdherence(logs, 7);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const avgScore = Math.round(
    data.reduce((acc, d) => acc + d.score, 0) / (data.length || 1)
  );

  // SVG dimensions
  const width = 640;
  const height = 180;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * chartW;
    const y = padTop + chartH - (d.score / 100) * chartH;
    return { ...d, x, y, index: i };
  });

  // Generate smooth spline path
  const makeSmoothPath = (pts) => {
    if (!pts.length) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = makeSmoothPath(points);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`
    : '';

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;
  const benchmarkY = padTop + chartH - 0.8 * chartH; // 80% line

  return (
    <div className="telemetry-chart-card">
      <div className="telemetry-chart-header">
        <div>
          <span className="telemetry-chart-kicker">7-Day Adherence Telemetry</span>
          <h3 className="telemetry-chart-title">{t('weeklyAdherence')}</h3>
        </div>

        <div className="telemetry-chart-stats">
          <div className="stat-pill">
            <span className="stat-pill-label">7-Day Avg</span>
            <strong className="stat-pill-value font-mono color-mint">{avgScore}%</strong>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Benchmark</span>
            <strong className="stat-pill-value font-mono">80% Target</strong>
          </div>
        </div>
      </div>

      <div className="telemetry-svg-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="telemetry-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="adherenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[0, 25, 50, 75, 100].map((level) => {
            const y = padTop + chartH - (level / 100) * chartH;
            return (
              <g key={level}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* 80% Benchmark Line */}
          <line
            x1={padLeft}
            y1={benchmarkY}
            x2={width - padRight}
            y2={benchmarkY}
            stroke="rgba(16, 185, 129, 0.4)"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />

          {/* Spline Area Fill */}
          <path d={areaPath} fill="url(#adherenceGradient)" />

          {/* Spline Curve Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Interactive Hover Nodes & Vertical Lines */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            const weekday = formatWeekday(`${pt.day}T12:00:00`, i18n.language);

            return (
              <g
                key={pt.day}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={padTop}
                    x2={pt.x}
                    y2={padTop + chartH}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Day X-axis label */}
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : 'var(--text-secondary)'}
                  fontSize="11"
                  fontFamily="Geist, sans-serif"
                  fontWeight={isHovered ? '600' : '400'}
                >
                  {weekday}
                </text>

                {/* Data point dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill={pt.score >= 80 ? '#10b981' : pt.score > 0 ? '#f59e0b' : '#64748b'}
                  stroke="#080b11"
                  strokeWidth="2"
                  style={{ transition: 'r 0.15s ease' }}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activePoint && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(activePoint.x / width) * 100}%`
            }}
          >
            <div className="tooltip-date">
              {formatWeekday(`${activePoint.day}T12:00:00`, i18n.language)} ({activePoint.day})
            </div>
            <div className="tooltip-val font-mono">
              <strong>{activePoint.score}%</strong>
              <span>({activePoint.taken}/{activePoint.total} doses)</span>
            </div>
          </div>
        )}
      </div>

      <div className="telemetry-chart-legend">
        <span className="legend-item">
          <i className="legend-pip bg-mint" />
          <span>7-Day Spline Curve</span>
        </span>
        <span className="legend-item">
          <i className="legend-pip bg-target" />
          <span>80% Clinical Standard</span>
        </span>
      </div>
    </div>
  );
}
