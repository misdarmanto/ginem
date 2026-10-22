import type { ReactNode } from "react";
import { Box, keyframes, useTheme } from "@mui/material";
import type { Expression } from "../voice/expression";

type Rect = readonly [x: number, y: number, w: number, h: number];

const BODY: Rect = [72, 90, 259, 186];
const ARM_LEFT: Rect = [12, 152, 60, 63];
const ARM_RIGHT: Rect = [331, 152, 58, 63];
const LEGS: Rect[] = [
  [72, 275, 35, 68],
  [137, 275, 31, 68],
  [232, 275, 31, 68],
  [294, 275, 37, 68],
];

const EYE_LEFT_X = 107;
const EYE_RIGHT_X = 262;
const EYE_Y = 119;
const EYE_SIZE = 33;
const SPEAKING_MOUTH_X = 176;
const SPEAKING_MOUTH_Y = 190;
const SPEAKING_MOUTH_WIDTH = 50;
const SPEAKING_MOUTH_MIN = 6;
const SPEAKING_MOUTH_RANGE = 30;

const QUESTION_MARK_ORIGIN = [296, 8] as const;
const QUESTION_MARK_UNIT = 11;
const QUESTION_MARK = [
  ".###.",
  "#...#",
  "....#",
  "..##.",
  "..#..",
  ".....",
  "..#..",
];

const happyEye = (x: number): Rect[] => [
  [x, 138, 11, 15],
  [x + 11, 124, 11, 15],
  [x + 22, 138, 11, 15],
];
const squareEyes = (y = EYE_Y, h = EYE_SIZE): Rect[] => [
  [EYE_LEFT_X, y, EYE_SIZE, h],
  [EYE_RIGHT_X, y, EYE_SIZE, h],
];

interface Face {
  eyes: Rect[];
  brows?: Rect[];
  mouth?: Rect[];
  /** Arm offset on the Y axis. */
  armLift?: number;
}

const FACES: Record<Expression, Face> = {
  neutral: { eyes: squareEyes() },
  happy: {
    eyes: [...happyEye(EYE_LEFT_X), ...happyEye(EYE_RIGHT_X)],
    mouth: [
      [166, 190, 12, 12],
      [178, 202, 43, 12],
      [221, 190, 12, 12],
    ],
    armLift: -26,
  },
  sad: {
    eyes: squareEyes(),
    brows: [
      [107, 104, 12, 9],
      [119, 98, 12, 9],
      [131, 92, 12, 9],
      [283, 104, 12, 9],
      [271, 98, 12, 9],
      [259, 92, 12, 9],
    ],
    mouth: [
      [166, 214, 12, 12],
      [178, 202, 43, 12],
      [221, 214, 12, 12],
    ],
    armLift: 14,
  },
  angry: {
    eyes: squareEyes(128, 24),
    brows: [
      [107, 96, 12, 9],
      [119, 102, 12, 9],
      [131, 108, 12, 9],
      [283, 96, 12, 9],
      [271, 102, 12, 9],
      [259, 108, 12, 9],
    ],
    mouth: [[166, 205, 67, 10]],
  },
  asking: {
    eyes: [
      [EYE_LEFT_X, EYE_Y, EYE_SIZE, EYE_SIZE],
      [EYE_RIGHT_X - 4, EYE_Y - 7, 41, 41],
    ],
    brows: [[EYE_LEFT_X, 98, EYE_SIZE, 8]],
    mouth: [[181, 205, 40, 10]],
  },
  surprised: {
    eyes: [
      [EYE_LEFT_X - 4, EYE_Y - 7, 41, 41],
      [EYE_RIGHT_X - 4, EYE_Y - 7, 41, 41],
    ],
    mouth: [[186, 190, 30, 38]],
    armLift: -20,
  },
  thinking: {
    eyes: squareEyes().map(([x, y, w, h]): Rect => [x + 10, y - 12, w, h]),
    mouth: [[186, 208, 30, 8]],
  },
};

const bob = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;
const jump = keyframes`
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-18px); }
`;
const sink = keyframes`
  0%, 100% { transform: translateY(4px); }
  50% { transform: translateY(10px); }
`;
const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
`;
const pop = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.07); }
  100% { transform: scale(1); }
`;
const sway = keyframes`
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
`;
const blink = keyframes`
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
`;
const dot = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
`;
const tear = keyframes`
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(26px); opacity: 0; }
`;

const BODY_MOTION: Record<Expression, string> = {
  neutral: `${bob} 2.6s ease-in-out infinite`,
  happy: `${jump} 0.9s ease-in-out infinite`,
  sad: `${sink} 3s ease-in-out infinite`,
  angry: `${shake} 0.14s linear infinite`,
  asking: `${bob} 2.6s ease-in-out infinite`,
  surprised: `${pop} 0.5s ease-out 1`,
  thinking: `${sway} 2.4s ease-in-out infinite`,
};

const BODY_TILT: Partial<Record<Expression, string>> = {
  asking: "rotate(-6deg)",
};

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

function Rects({
  items,
  fill,
}: {
  items: readonly Rect[];
  fill: string;
}): ReactNode {
  return items.map(([x, y, w, h]) => (
    <rect
      key={`${x}-${y}-${w}-${h}`}
      x={x}
      y={y}
      width={w}
      height={h}
      fill={fill}
    />
  ));
}

function QuestionMark() {
  const [originX, originY] = QUESTION_MARK_ORIGIN;
  return QUESTION_MARK.flatMap((row, r) =>
    [...row].flatMap((cell, c) =>
      cell === "#"
        ? [
            <rect
              key={`${r}-${c}`}
              x={originX + c * QUESTION_MARK_UNIT}
              y={originY + r * QUESTION_MARK_UNIT}
              width={QUESTION_MARK_UNIT}
              height={QUESTION_MARK_UNIT}
              fill="currentColor"
            />,
          ]
        : [],
    ),
  );
}

function ThinkingDots() {
  return [0, 1, 2].map((i) => (
    <rect
      key={i}
      x={300 + i * 25}
      y={40}
      width={14}
      height={14}
      fill="currentColor"
      style={{ animation: `${dot} 1.2s ease-in-out ${i * 0.25}s infinite` }}
    />
  ));
}

interface PixelAvatarProps {
  expression?: Expression;
  /** 0..1 jaw opening while speaking; undefined keeps the expression's own mouth. */
  mouthOpen?: number;
  size?: number | string;
  /** Turns off idle motion, e.g. for small static icons. */
  still?: boolean;
}

export default function PixelAvatar({
  expression = "neutral",
  mouthOpen,
  size = 200,
  still = false,
}: PixelAvatarProps) {
  const { palette } = useTheme();
  const bodyColor =
    expression === "angry" ? palette.error.main : palette.primary.main;
  const featureColor = palette.primary.contrastText;
  const face = FACES[expression];
  const armLift = face.armLift ?? 0;
  const mouth =
    mouthOpen === undefined ? (
      <Rects items={face.mouth ?? []} fill={featureColor} />
    ) : (
      <rect
        x={SPEAKING_MOUTH_X}
        y={SPEAKING_MOUTH_Y}
        width={SPEAKING_MOUTH_WIDTH}
        height={SPEAKING_MOUTH_MIN + mouthOpen * SPEAKING_MOUTH_RANGE}
        fill={featureColor}
      />
    );

  return (
    <Box
      component="svg"
      viewBox="0 0 400 400"
      aria-hidden="true"
      data-expression={expression}
      sx={{
        width: size,
        height: size,
        color: "text.primary",
        overflow: "visible",
      }}
    >
      <Box
        component="g"
        sx={{
          transformOrigin: "200px 343px",
          transform: BODY_TILT[expression],
          animation: still ? "none" : BODY_MOTION[expression],
          [REDUCED_MOTION]: { animation: "none" },
        }}
      >
        <g fill={bodyColor}>
          <g
            style={{
              transform: `translateY(${armLift}px)`,
              transition: "transform 0.3s",
            }}
          >
            <Rects items={[ARM_LEFT, ARM_RIGHT]} fill={bodyColor} />
          </g>
          <Rects items={[BODY, ...LEGS]} fill={bodyColor} />
        </g>

        <Box
          component="g"
          sx={{
            transformOrigin: "200px 135px",
            animation: still ? "none" : `${blink} 4.5s ease-in-out infinite`,
            [REDUCED_MOTION]: { animation: "none" },
          }}
        >
          <Rects items={face.eyes} fill={featureColor} />
          {expression === "surprised" && (
            <Rects
              items={[
                [EYE_LEFT_X, EYE_Y - 3, 14, 14],
                [EYE_RIGHT_X, EYE_Y - 3, 14, 14],
              ]}
              fill={bodyColor}
            />
          )}
        </Box>
        <Rects items={face.brows ?? []} fill={featureColor} />
        {mouth}
        {expression === "sad" && (
          <rect
            x={EYE_LEFT_X + 4}
            y={158}
            width={10}
            height={20}
            fill={palette.info.light}
            style={{
              animation: still ? "none" : `${tear} 1.8s ease-in infinite`,
            }}
          />
        )}
      </Box>

      {expression === "asking" && <QuestionMark />}
      {expression === "thinking" && <ThinkingDots />}
    </Box>
  );
}
