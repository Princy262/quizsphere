import { getYTicks } from '../utils/chartScale.js';

const W = 640;
const H = 340;
const M = { left: 52, right: 24, top: 30, bottom: 46 };

// data = [{ attemptNumber, label, score | null } x3], maxScore = number of questions
const AttemptChart = ({ data, maxScore }) => {
  const ticks = getYTicks(maxScore);
  const yMax = ticks[ticks.length - 1];

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const slot = plotW / data.length; // width given to each attempt
  const barW = Math.min(90, slot * 0.5);

  const xCenter = (i) => M.left + slot * (i + 0.5);
  const y = (v) => M.top + plotH * (1 - v / yMax);
  const baseline = y(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img">
      <title>Your marks across attempts</title>

      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--secondary)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>

      {/* horizontal grid lines + Y labels */}
      {[0, ...ticks].map((t) => (
        <g key={t}>
          <line
            x1={M.left}
            x2={W - M.right}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray={t === 0 ? '0' : '4 4'}
          />
          <text x={M.left - 10} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
            {t}
          </text>
        </g>
      ))}

      {/* axis title */}
      <text
        x={14}
        y={M.top + plotH / 2}
        transform={`rotate(-90 14 ${M.top + plotH / 2})`}
        textAnchor="middle"
        fontSize="12"
        fill="var(--muted)"
      >
        Marks
      </text>

      {/* bars */}
      {data.map((d, i) => {
        const cx = xCenter(i);
        const x0 = cx - barW / 2;

        if (d.score === null) {
          return (
            <g key={d.attemptNumber}>
              <rect
                x={x0}
                y={y(yMax * 0.12)}
                width={barW}
                height={baseline - y(yMax * 0.12)}
                rx="8"
                fill="none"
                stroke="var(--border)"
                strokeWidth="2"
                strokeDasharray="6 5"
              />
              <text
                x={cx}
                y={baseline - 10}
                textAnchor="middle"
                fontSize="11"
                fill="var(--muted)"
              >
                Not attempted
              </text>
              <text x={cx} y={H - 14} textAnchor="middle" fontSize="13" fill="var(--muted)">
                {d.label}
              </text>
            </g>
          );
        }

        // a score of 0 still gets a thin visible bar
        const barH = Math.max(baseline - y(d.score), 4);

        return (
          <g key={d.attemptNumber}>
            <rect
              x={x0}
              y={baseline - barH}
              width={barW}
              height={barH}
              rx="8"
              fill="url(#barGradient)"
            />
            <text
              x={cx}
              y={baseline - barH - 8}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="var(--primary)"
            >
              {d.score}
            </text>
            <text x={cx} y={H - 14} textAnchor="middle" fontSize="13" fill="var(--text)">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default AttemptChart;