import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const COLS = 7;
const ROWS = 10;
const MAX_TURNS = 10;

const SYMBOL_CONFIG = {
  0: { char: '⭐', family: 'neutral', rarity: 'common', powers: ['wild_seed'], label: 'Wild Seed' },
  1: { char: '🔥', family: 'red', rarity: 'common', powers: ['color'], label: 'Blaze' },
  2: { char: '💧', family: 'blue', rarity: 'common', powers: ['color'], label: 'Tide' },
  3: { char: '🍃', family: 'black', rarity: 'common', powers: ['color'], label: 'Veil' },
  4: { char: '⚡', family: 'neutral', rarity: 'uncommon', powers: ['combo_boost'], label: 'Charge' },
  5: { char: '🪙', family: 'treasure', rarity: 'uncommon', powers: ['score_shard'], label: 'Shard' },
  6: { char: '🧿', family: 'arcane', rarity: 'rare', powers: ['bomb_cleanse'], label: 'Arcane' },
  7: { char: '7', family: 'legend', rarity: 'mythic', powers: ['set_bonus'], label: 'Legend 7' },
  8: { char: 'J', family: 'royal', rarity: 'rare', powers: ['royal_set'], label: 'Jack' },
  9: { char: 'Q', family: 'royal', rarity: 'rare', powers: ['royal_set', 'promote_K_on_gate'], label: 'Queen' },
};

const CRAFTED_SYMBOLS = {
  K: { char: 'K', family: 'royal', rarity: 'mythic', powers: ['royal_set', 'column_clear'], label: 'King' },
};

const GLYPH_SYMBOL = {
  char: '✶',
  family: 'legend',
  rarity: 'mythic',
  powers: ['glyph_reward'],
  label: 'Sigil Glyph',
};

const FAMILY_GRADIENTS = {
  red: ['#f87171', '#fb7185'],
  blue: ['#38bdf8', '#6366f1'],
  black: ['#475569', '#1e293b'],
  treasure: ['#fbbf24', '#f97316'],
  arcane: ['#c084fc', '#22d3ee'],
  legend: ['#f472b6', '#60a5fa'],
  royal: ['#fcd34d', '#fb923c'],
  neutral: ['#94a3b8', '#cbd5f5'],
};

const RARITY_GLOWS = {
  common: '0 0 0 1px rgba(148, 163, 184, 0.35)',
  uncommon: '0 0 25px rgba(34, 197, 94, 0.4)',
  rare: '0 0 28px rgba(129, 140, 248, 0.45)',
  mythic: '0 0 32px rgba(253, 224, 71, 0.55)',
};

const RARITY_ACCENTS = {
  common: 'border-slate-600/60 bg-slate-800/80 text-slate-200',
  uncommon: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
  rare: 'border-indigo-400/40 bg-indigo-500/20 text-indigo-100',
  mythic: 'border-amber-400/50 bg-amber-400/20 text-amber-100',
};

const getSymbolVisuals = (symbol, { isSelected = false, isPowerTarget = false } = {}) => {
  if (!symbol) {
    let emptyShadow = 'inset 0 0 0 1px rgba(51, 65, 85, 0.45), inset 0 -25px 60px -50px rgba(148, 163, 184, 0.8)';
    if (isPowerTarget) {
      emptyShadow = `0 0 18px rgba(56, 189, 248, 0.6), ${emptyShadow}`;
    }
    return {
      background: 'radial-gradient(circle at 30% 25%, rgba(148, 163, 184, 0.16), rgba(15, 23, 42, 0.9))',
      color: '#475569',
      boxShadow: emptyShadow,
      border: '1px solid rgba(71, 85, 105, 0.45)',
    };
  }

  const [from, to] = FAMILY_GRADIENTS[symbol.family] || ['#64748b', '#1e293b'];
  const baseShadow = RARITY_GLOWS[symbol.rarity] || '0 0 18px rgba(148, 163, 184, 0.35)';
  let boxShadow = `${baseShadow}, inset 0 0 0 1px rgba(255, 255, 255, 0.12)`;
  if (isSelected) {
    boxShadow = `0 0 24px rgba(250, 204, 21, 0.7), ${boxShadow}`;
  }
  if (isPowerTarget) {
    boxShadow = `0 0 26px rgba(56, 189, 248, 0.65), ${boxShadow}`;
  }

  const textColor =
    symbol.family === 'black' ? '#e2e8f0' : symbol.family === 'arcane' ? '#0b1120' : '#0f172a';

  return {
    background: `linear-gradient(140deg, ${from}, ${to})`,
    color: textColor,
    boxShadow,
    border: '1px solid rgba(255, 255, 255, 0.16)',
  };
};

const TRI_SHAPES = [
  [
    [0, 0],
    [1, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
];

const TETRO_SHAPES = [
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
];

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));

const mulberry32 = (a) => {
  let seed = a >>> 0;
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const sha256 = (ascii) => {
  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  const hash = (sha256.h = sha256.h || []);
  const k = (sha256.k = sha256.k || []);
  let primeCounter = k[lengthProperty];
  const isComposite = {};

  for (let candidate = 2; primeCounter < 64; candidate += 1) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter += 1;
    }
  }

  ascii += '\u0080';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\u0000';
  for (let i = 0; i < ascii[lengthProperty]; i += 1) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] = words[i >> 2] | (j << ((3 - (i % 4)) * 8));
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (let j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i += 1) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i += 1) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i += 1) {
    for (let j = 3; j + 1; j -= 1) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16 ? '0' : '') + b.toString(16));
    }
  }
  return result;
};

const generateDigitsFromSeed = (seed, count) => {
  const digits = [];
  for (let i = 0; digits.length < count; i += 1) {
    const block = sha256(`${seed}|${i}`);
    for (let j = 0; j < block.length && digits.length < count; j += 1) {
      const nibble = parseInt(block[j], 16);
      digits.push(nibble % 10);
    }
  }
  return digits;
};

const computeEntropyBand = (digits) => {
  const counts = Array(10).fill(0);
  digits.forEach((d) => {
    counts[d] += 1;
  });
  const total = digits.length || 1;
  const freqs = counts.map((c) => c / total);
  const uniformDeviation = freqs.reduce((sum, p) => sum + Math.abs(p - 0.1), 0) / 10;

  let maxRun = 1;
  let currentRun = 1;
  for (let i = 1; i < digits.length; i += 1) {
    if (digits[i] === digits[i - 1]) {
      currentRun += 1;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }

  let pal5 = 0;
  for (let i = 0; i <= digits.length - 5; i += 1) {
    const slice = digits.slice(i, i + 5);
    const reversed = [...slice].reverse();
    if (slice.every((value, idx) => value === reversed[idx])) {
      pal5 += 1;
    }
  }

  const entropyScore = uniformDeviation + 0.15 * (maxRun / total) + 0.1 * (pal5 / Math.max(total / 5, 1));
  if (entropyScore < 0.16) return 'low';
  if (entropyScore < 0.23) return 'mid';
  return 'high';
};

const createQueue = (seed, count = 60) => {
  const digits = generateDigitsFromSeed(seed, count + 12);
  const band = computeEntropyBand(digits.slice(0, 30));
  const firstHash = sha256(seed);
  const rngSeed = parseInt(firstHash.slice(0, 8), 16) >>> 0;
  const rng = mulberry32(rngSeed);

  const entries = digits.slice(0, count).map((digit, idx) => {
    let base = SYMBOL_CONFIG[digit];
    if (!base) {
      base = SYMBOL_CONFIG[digit % 10];
    }
    let symbol = base;

    if (band === 'high' && base.rarity === 'common' && rng() < 0.32) {
      const highPull = [SYMBOL_CONFIG[6], SYMBOL_CONFIG[8], SYMBOL_CONFIG[9]];
      symbol = highPull[Math.floor(rng() * highPull.length)] || base;
    } else if (band === 'low' && base.rarity !== 'common' && rng() < 0.28) {
      const calming = [SYMBOL_CONFIG[0], SYMBOL_CONFIG[1], SYMBOL_CONFIG[2], SYMBOL_CONFIG[3]];
      symbol = calming[Math.floor(rng() * calming.length)] || base;
    }

    return {
      index: idx,
      digit,
      ...symbol,
    };
  });

  return {
    entries,
    digits,
    band,
    queueHash: sha256(entries.map((e) => e.digit).join('')),
    rngSeed,
  };
};

const normalizeOffsets = (offsets) => {
  const minRow = Math.min(...offsets.map(([r]) => r));
  const minCol = Math.min(...offsets.map(([, c]) => c));
  return offsets.map(([r, c]) => [r - minRow, c - minCol]);
};

const rotateOffsets = (offsets) => {
  const rotated = offsets.map(([r, c]) => [c, -r]);
  return normalizeOffsets(rotated);
};

const buildPiece = (symbols, offsets) => {
  const normalized = normalizeOffsets(offsets);
  const width = Math.max(...normalized.map(([, c]) => c)) + 1;
  const height = Math.max(...normalized.map(([r]) => r)) + 1;

  return {
    blocks: symbols.map((symbol, idx) => ({
      symbol,
      offset: normalized[idx],
    })),
    width,
    height,
  };
};

const getNeighbors = (row, col) => [
  [row - 1, col],
  [row + 1, col],
  [row, col - 1],
  [row, col + 1],
];

const cloneBoard = (board) => board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

const applyGravity = (board) => {
  const next = createEmptyBoard();
  for (let col = 0; col < COLS; col += 1) {
    let pointer = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (board[row][col]) {
        next[pointer][col] = { ...board[row][col] };
        pointer -= 1;
      }
    }
  }
  return next;
};

const findColorMatches = (board) => {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const groups = [];
  const colorFamilies = new Set(['red', 'blue', 'black', 'green']);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (visited[row][col]) continue;
      const cell = board[row][col];
      if (!cell) continue;

      const isColor = colorFamilies.has(cell.family);
      if (!isColor) {
        visited[row][col] = true;
        continue;
      }

      const stack = [[row, col]];
      const cluster = [];
      visited[row][col] = true;

      while (stack.length) {
        const [r, c] = stack.pop();
        cluster.push([r, c]);
        getNeighbors(r, c).forEach(([nr, nc]) => {
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
          if (visited[nr][nc]) return;
          const neighbor = board[nr][nc];
          if (!neighbor) return;
          if (neighbor.family === cell.family || neighbor.char === '⭐') {
            visited[nr][nc] = true;
            stack.push([nr, nc]);
          }
        });
      }

      if (cluster.length >= 3) {
        groups.push({ cells: cluster, family: cell.family });
      }
    }
  }

  return groups;
};

const findRoyalSequences = (board) => {
  const lines = [];
  const legendLines = [];

  const checkLine = (cells) => {
    const chars = cells.map(([r, c]) => board[r][c]?.char).filter(Boolean);
    if (chars.length !== cells.length) return;
    const set = new Set(chars);
    if (cells.length === 3 && set.has('J') && set.has('Q') && set.has('K')) {
      lines.push(cells);
    }
    if (cells.length === 4) {
      const expected = new Set(['J', 'Q', 'K', '7']);
      if (chars.every((ch) => expected.has(ch)) && set.size === 4) {
        legendLines.push(cells);
      }
    }
  };

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col <= COLS - 3; col += 1) {
      const three = [
        [row, col],
        [row, col + 1],
        [row, col + 2],
      ];
      checkLine(three);
      if (col <= COLS - 4) {
        const four = [...three, [row, col + 3]];
        checkLine(four);
      }
    }
  }

  for (let col = 0; col < COLS; col += 1) {
    for (let row = 0; row <= ROWS - 3; row += 1) {
      const three = [
        [row, col],
        [row + 1, col],
        [row + 2, col],
      ];
      checkLine(three);
      if (row <= ROWS - 4) {
        const four = [...three, [row + 3, col]];
        checkLine(four);
      }
    }
  }

  return { lines, legendLines };
};

const craftKings = (board) => {
  const next = cloneBoard(board);
  let crafted = 0;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = next[row][col];
      if (!cell || cell.char !== 'J') continue;
      const neighbors = getNeighbors(row, col);
      const hasQueen = neighbors.some(([nr, nc]) => {
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
        const neighbor = next[nr][nc];
        return neighbor && neighbor.char === 'Q';
      });
      if (hasQueen) {
        next[row][col] = { ...CRAFTED_SYMBOLS.K };
        crafted += 1;
      }
    }
  }

  return { board: next, crafted };
};

const clearCells = (board, cells) => {
  const next = cloneBoard(board);
  cells.forEach(([row, col]) => {
    next[row][col] = null;
  });
  return next;
};

const scoreToMultiplier = (score) => 1 + score / 200;

const RitualDrop = () => {
  const [serverSeed, setServerSeed] = useState('prime-vault-alpha');
  const [clientNonce, setClientNonce] = useState('entropy-runner');
  const [round, setRound] = useState(1);
  const [wheelPayout, setWheelPayout] = useState(1.75);

  const revealSeed = useMemo(
    () => `${serverSeed}|${clientNonce}|${round}|drop`,
    [serverSeed, clientNonce, round],
  );

  const queueInfo = useMemo(() => createQueue(revealSeed, 80), [revealSeed]);
  const [board, setBoard] = useState(createEmptyBoard);
  const [turnsRemaining, setTurnsRemaining] = useState(MAX_TURNS);
  const [turnPhase, setTurnPhase] = useState('placing');
  const [queuePointer, setQueuePointer] = useState(0);
  const [activePiece, setActivePiece] = useState(null);
  const [rotationsLeft, setRotationsLeft] = useState(1);
  const [swapAvailable, setSwapAvailable] = useState(true);
  const [powerAvailable, setPowerAvailable] = useState(true);
  const [score, setScore] = useState(0);
  const [cascadeLog, setCascadeLog] = useState([]);
  const [shardCount, setShardCount] = useState(0);
  const [sessionBonus, setSessionBonus] = useState(1);
  const [powers, setPowers] = useState({ wild: 0, combo: 0, bomb: 0 });
  const [comboBoostActive, setComboBoostActive] = useState(false);
  const [royalMeter, setRoyalMeter] = useState(0);
  const [log, setLog] = useState([]);
  const [swapSelection, setSwapSelection] = useState([]);
  const [powerMode, setPowerMode] = useState(null);
  const [recentGlow, setRecentGlow] = useState([]);
  const [boardPulse, setBoardPulse] = useState(0);
  const rngRef = useRef(() => 0.5);
  const idRef = useRef(0);
  const queuePointerRef = useRef(0);
  const glowTimeoutRef = useRef(null);

  const ambientOrbs = useMemo(() => {
    const localRng = mulberry32(queueInfo.rngSeed || 1);
    const palette = [
      'rgba(56, 189, 248, 0.32)',
      'rgba(168, 85, 247, 0.28)',
      'rgba(14, 165, 233, 0.26)',
      'rgba(16, 185, 129, 0.24)',
      'rgba(236, 72, 153, 0.24)',
    ];
    return Array.from({ length: 14 }, (_, idx) => {
      const tint = palette[Math.floor(localRng() * palette.length)] || palette[0];
      return {
        id: idx,
        top: `${Math.floor(localRng() * 100)}%`,
        left: `${Math.floor(localRng() * 100)}%`,
        size: 180 + localRng() * 240,
        duration: 16 + localRng() * 14,
        delay: -localRng() * 18,
        gradient: `radial-gradient(circle at 30% 30%, ${tint}, transparent 65%)`,
      };
    });
  }, [queueInfo.rngSeed]);

  const shardRemainder = shardCount % 3;
  const shardProgress = shardRemainder === 0 ? (shardCount > 0 ? 1 : 0) : shardRemainder / 3;
  const nextShardCountdown = shardRemainder === 0 ? 3 : 3 - shardRemainder;

  const activePreview = useMemo(() => {
    if (!activePiece) return null;
    const grid = Array.from({ length: activePiece.height }, () =>
      Array.from({ length: activePiece.width }, () => null),
    );
    activePiece.blocks.forEach(({ symbol, offset: [r, c] }) => {
      if (grid[r] && typeof grid[r][c] !== 'undefined') {
        grid[r][c] = symbol;
      }
    });
    return { grid, width: activePiece.width };
  }, [activePiece]);

  const activePieceSummary = useMemo(() => {
    if (!activePiece) return [];
    const summaryMap = new Map();
    activePiece.blocks.forEach(({ symbol }) => {
      if (!symbol) return;
      if (!summaryMap.has(symbol.label)) {
        summaryMap.set(symbol.label, {
          label: symbol.label,
          rarity: symbol.rarity,
          char: symbol.char,
        });
      }
    });
    return Array.from(summaryMap.values());
  }, [activePiece]);

  const pieceTypeLabel = useMemo(() => {
    if (!activePiece) return 'Awaiting draw';
    if (activePiece.blocks.length === 3) return 'Tri Sigil';
    if (activePiece.blocks.length === 4) return 'Tetra Sigil';
    return `${activePiece.blocks.length}-Glyph Chain`;
  }, [activePiece]);

  const resetBoardState = useCallback(() => {
    setBoard(createEmptyBoard());
    setTurnsRemaining(MAX_TURNS);
    setTurnPhase('placing');
    queuePointerRef.current = 0;
    setQueuePointer(0);
    setActivePiece(null);
    setRotationsLeft(1);
    setSwapAvailable(true);
    setPowerAvailable(true);
    setScore(0);
    setCascadeLog([]);
    setShardCount(0);
    setSessionBonus(1);
    setPowers({ wild: 0, combo: 0, bomb: 0 });
    setComboBoostActive(false);
    setRoyalMeter(0);
    setLog([]);
    setSwapSelection([]);
    setPowerMode(null);
    setRecentGlow([]);
    setBoardPulse(0);
    if (glowTimeoutRef.current) {
      clearTimeout(glowTimeoutRef.current);
      glowTimeoutRef.current = null;
    }
  }, []);

  const drawNextPiece = useCallback(() => {
    setRotationsLeft(1);
    setSwapAvailable(true);
    setPowerAvailable(true);
    setSwapSelection([]);
    setPowerMode(null);
    setRecentGlow([]);

    const rng = rngRef.current || (() => 0.5);
    const size = rng() < 0.45 ? 3 : 4;
    const start = queuePointerRef.current;
    const slice = queueInfo.entries.slice(start, start + size);
    if (slice.length < size) {
      setActivePiece(null);
      return;
    }

    const shapes = size === 3 ? TRI_SHAPES : TETRO_SHAPES;
    const offsets = shapes[Math.floor(rng() * shapes.length)] || shapes[0];
    const piece = buildPiece(slice, offsets);
    const spawnCol = Math.max(0, Math.min(COLS - piece.width, Math.floor((COLS - piece.width) / 2)));
    setActivePiece({
      ...piece,
      position: { row: 0, col: spawnCol },
      rotationsRemaining: 1,
    });
    queuePointerRef.current = start + size;
    setQueuePointer(queuePointerRef.current);
  }, [queueInfo.entries]);

  useEffect(() => {
    rngRef.current = mulberry32(queueInfo.rngSeed);
    resetBoardState();
    drawNextPiece();
  }, [queueInfo, resetBoardState, drawNextPiece]);

  useEffect(
    () => () => {
      if (glowTimeoutRef.current) {
        clearTimeout(glowTimeoutRef.current);
      }
    },
    [],
  );

  const handleReset = () => {
    resetBoardState();
    queuePointerRef.current = 0;
    drawNextPiece();
  };

  const resolveBoard = (initialBoard, actionLabel) => {
    let workingBoard = initialBoard;
    let cascade = 0;
    const cascadeEntries = [];
    let localScoreGain = 0;
    let localShards = 0;
    let localComboCollected = 0;
    let localBombs = 0;
    let localWilds = 0;
    let localRoyals = 0;
    let craftedKingsCount = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const matches = findColorMatches(workingBoard);
      const { lines: royalLines, legendLines } = findRoyalSequences(workingBoard);

      const cellsToClear = new Set();
      matches.forEach((group) => {
        group.cells.forEach((cell) => cellsToClear.add(cell.toString()));
      });
      royalLines.forEach((line) => {
        line.forEach((cell) => cellsToClear.add(cell.toString()));
      });
      legendLines.forEach((line) => {
        line.forEach((cell) => cellsToClear.add(cell.toString()));
      });

      if (cellsToClear.size === 0) break;

      cascade += 1;
      let legendBloom = false;
      const clearedCells = Array.from(cellsToClear).map((key) => key.split(',').map((v) => parseInt(v, 10)));
      const clearedSymbols = clearedCells.map(([r, c]) => workingBoard[r][c]);

      clearedSymbols.forEach((cell) => {
        if (!cell) return;
        if (cell.char === '🪙') localShards += 1;
        if (cell.char === '⚡') localComboCollected += 1;
        if (cell.char === '🧿') localBombs += 1;
        if (cell.char === '⭐') localWilds += 1;
        if (['J', 'Q', 'K', '7'].includes(cell.char)) localRoyals += 1;
      });

      const matchScore = matches.reduce((sum, group) => sum + 10 * (group.cells.length - 2), 0);
      let cascadeScore = matchScore;
      if (royalLines.length > 0) {
        cascadeScore *= 1.5;
      }
      if (legendLines.length > 0) {
        cascadeScore *= 2;
        legendBloom = true;
      }
      if (comboBoostActive) {
        cascadeScore *= 2;
        setComboBoostActive(false);
      }
      cascadeScore *= 1 + 0.1 * (cascade - 1);
      localScoreGain += cascadeScore;

      workingBoard = clearCells(workingBoard, clearedCells);
      if (legendBloom) {
        const royalsToPurge = [];
        for (let row = 0; row < ROWS; row += 1) {
          for (let col = 0; col < COLS; col += 1) {
            const cell = workingBoard[row][col];
            if (cell && ['J', 'Q', 'K'].includes(cell.char)) {
              royalsToPurge.push([row, col]);
            }
          }
        }
        workingBoard = clearCells(workingBoard, royalsToPurge);
      }

      workingBoard = applyGravity(workingBoard);
      const { board: craftedBoard, crafted } = craftKings(workingBoard);
      workingBoard = craftedBoard;
      craftedKingsCount += crafted;

      if (legendBloom) {
        const rng = rngRef.current || (() => 0.5);
        const glyphs = 2 + Math.floor(rng() * 2);
        for (let i = 0; i < glyphs; i += 1) {
          const column = Math.floor((rng() || 0.5) * COLS);
          for (let row = ROWS - 1; row >= 0; row -= 1) {
            if (!workingBoard[row][column]) {
              workingBoard[row][column] = { ...GLYPH_SYMBOL, id: `glyph-${idRef.current}` };
              idRef.current += 1;
              break;
            }
          }
        }
        workingBoard = applyGravity(workingBoard);
      }

      cascadeEntries.push({
        cascade,
        cleared: clearedCells.length,
        scoreGain: cascadeScore,
        royals: royalLines.length,
        legend: legendBloom,
      });
    }

    setBoard(workingBoard);

    if (cascadeEntries.length === 0) return;

    setBoardPulse((prev) => prev + 1);

    setCascadeLog((prev) => [
      ...prev,
      {
        action: actionLabel,
        cascades: cascadeEntries,
      },
    ]);
    if (localScoreGain > 0) {
      setScore((prev) => prev + localScoreGain);
    }
    if (localShards > 0) {
      setShardCount((prev) => prev + localShards);
    }
    if (localComboCollected > 0 || localBombs > 0 || localWilds > 0) {
      setPowers((prev) => ({
        wild: prev.wild + localWilds,
        combo: prev.combo + localComboCollected,
        bomb: prev.bomb + localBombs,
      }));
    }
    if (localRoyals > 0) {
      setRoyalMeter((prev) => prev + localRoyals + craftedKingsCount);
    }

    setLog((prev) => [
      ...prev,
      `${actionLabel} → ${cascadeEntries.length} cascades, +${localScoreGain.toFixed(0)} pts`,
    ]);
  };

  const canPlace = (piece, targetRow, targetCol, boardState = board) => {
    if (!piece) return false;
    return piece.blocks.every(({ offset: [r, c] }) => {
      const row = targetRow + r;
      const col = targetCol + c;
      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
      return !boardState[row][col];
    });
  };

  const dropPieceAt = (col) => {
    if (!activePiece || turnPhase !== 'placing') return;
    const safeCol = Math.max(0, Math.min(col, COLS - activePiece.width));

    let row = 0;
    while (canPlace(activePiece, row + 1, safeCol)) {
      row += 1;
    }
    if (!canPlace(activePiece, row, safeCol)) return;

    const placed = cloneBoard(board);
    const placements = [];
    activePiece.blocks.forEach(({ symbol, offset: [r, c] }) => {
      const targetRow = row + r;
      const targetCol = safeCol + c;
      placements.push([targetRow, targetCol]);
      placed[targetRow][targetCol] = {
        ...symbol,
        id: `${symbol.char}-${idRef.current}`,
      };
      idRef.current += 1;
    });

    const glowKeys = placements.map(([r, c]) => `${r}-${c}`);
    setRecentGlow(glowKeys);
    if (glowTimeoutRef.current) {
      clearTimeout(glowTimeoutRef.current);
    }
    glowTimeoutRef.current = setTimeout(() => {
      setRecentGlow([]);
      glowTimeoutRef.current = null;
    }, 900);

    setBoard(placed);
    setActivePiece(null);
    setTurnPhase('postPlacement');
    resolveBoard(placed, `Placed piece at column ${safeCol + 1}`);
  };

  const handleRotate = () => {
    if (!activePiece || rotationsLeft <= 0 || turnPhase !== 'placing') return;
    const rotatedOffsets = rotateOffsets(activePiece.blocks.map(({ offset }) => offset));
    const rotatedPiece = buildPiece(activePiece.blocks.map(({ symbol }) => symbol), rotatedOffsets);
    const newCol = Math.min(activePiece.position.col, COLS - rotatedPiece.width);
    if (!canPlace(rotatedPiece, 0, newCol)) return;
    setActivePiece({
      ...rotatedPiece,
      position: { row: 0, col: newCol },
      rotationsRemaining: activePiece.rotationsRemaining - 1,
    });
    setRotationsLeft((prev) => prev - 1);
  };

  const startSwapMode = () => {
    if (!swapAvailable || turnPhase !== 'postPlacement') return;
    setSwapSelection([]);
  };

  const executeSwap = (first, second) => {
    const [r1, c1] = first;
    const [r2, c2] = second;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    const next = cloneBoard(board);
    const temp = next[r1][c1];
    next[r1][c1] = next[r2][c2];
    next[r2][c2] = temp;
    setBoard(next);
    setSwapAvailable(false);
    setSwapSelection([]);
    resolveBoard(next, 'Swap move');
  };

  const handleCellClick = (row, col) => {
    if (turnPhase === 'placing' && activePiece) {
      dropPieceAt(col);
      return;
    }

    if (turnPhase === 'postPlacement') {
      if (powerMode === 'bomb' && powers.bomb > 0) {
        triggerBomb(row, col);
        return;
      }
      if (powerMode === 'wild' && powers.wild > 0) {
        deployWild(col);
        return;
      }
      if (swapAvailable) {
        setSwapSelection((prev) => {
          if (prev.length === 0) return [[row, col]];
          if (prev.length === 1) {
            executeSwap(prev[0], [row, col]);
            return [];
          }
          return [];
        });
      }
    }
  };

  const triggerBomb = (row, col) => {
    const cells = new Set();
    [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].forEach(([r, c]) => {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        cells.add(`${r},${c}`);
      }
    });
    const cleared = Array.from(cells).map((key) => key.split(',').map((v) => parseInt(v, 10)));
    const next = clearCells(board, cleared);
    const settled = applyGravity(next);
    setBoard(settled);
    setPowers((prev) => ({ ...prev, bomb: prev.bomb - 1 }));
    setPowerMode(null);
    resolveBoard(settled, 'Arcane bomb');
  };

  const deployWild = (col) => {
    const next = cloneBoard(board);
    let placed = false;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (!next[row][col]) {
        next[row][col] = { ...SYMBOL_CONFIG[0], id: `wild-${idRef.current}` };
        idRef.current += 1;
        placed = true;
        break;
      }
    }
    if (!placed) {
      setPowerAvailable(true);
      setPowerMode(null);
      return;
    }
    const settled = applyGravity(next);
    setBoard(settled);
    setPowers((prev) => ({ ...prev, wild: prev.wild - 1 }));
    setPowerMode(null);
    resolveBoard(settled, 'Wild seed drop');
  };

  const activateCombo = () => {
    if (powers.combo <= 0 || !powerAvailable) return;
    setComboBoostActive(true);
    setPowers((prev) => ({ ...prev, combo: prev.combo - 1 }));
    setPowerAvailable(false);
    setLog((prev) => [...prev, 'Combo boost primed']);
  };

  const endTurn = () => {
    if (turnPhase === 'placing') return;
    if (turnsRemaining <= 1) {
      setTurnsRemaining(0);
      setTurnPhase('complete');
      setActivePiece(null);
      return;
    }
    setTurnsRemaining((prev) => prev - 1);
    setTurnPhase('placing');
    drawNextPiece();
  };

  useEffect(() => {
    if (turnsRemaining === 0) {
      setActivePiece(null);
    }
  }, [turnsRemaining]);

  useEffect(() => {
    if (shardCount > 0) {
      const bonus = 1 + Math.min(Math.floor(shardCount / 3) * 0.25, 1);
      setSessionBonus(bonus);
    } else {
      setSessionBonus(1);
    }
  }, [shardCount]);

  const payout = useMemo(() => {
    if (turnsRemaining > 0) return 0;
    const dropMultiplier = scoreToMultiplier(score);
    return wheelPayout * dropMultiplier * sessionBonus;
  }, [turnsRemaining, score, wheelPayout, sessionBonus]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ritual-midnight text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-ritual-grid opacity-75" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 10% 90%, rgba(34, 197, 94, 0.18), transparent 55%), radial-gradient(circle at 90% 75%, rgba(14, 165, 233, 0.15), transparent 60%)',
          mixBlendMode: 'screen',
        }}
      />
      <div className="ambient-veil pointer-events-none absolute inset-0">
        {ambientOrbs.map((orb) => (
          <span
            key={orb.id}
            className="ritual-orb"
            style={{
              top: orb.top,
              left: orb.left,
              width: orb.size,
              height: orb.size,
              animationDuration: `${orb.duration}s`,
              animationDelay: `${orb.delay}s`,
              background: orb.gradient,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-sky-300/80">
                <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-[0.6rem] tracking-[0.45em] text-sky-200">
                  Seed Locked
                </span>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[0.6rem] tracking-[0.45em] text-emerald-200">
                  Cascades Online
                </span>
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight text-slate-50 md:text-5xl">
                Ritual Drop Prototype
              </h1>
              <p className="max-w-2xl text-sm text-slate-300">
                Commit-reveal seeded symbol rain with cascades, royal set bonuses, and glyph blooms forged inside a glassy
                command chamber.
              </p>
            </div>
            <div className="hidden rounded-3xl border border-slate-700/50 bg-slate-900/60 px-6 py-4 text-right shadow-glow backdrop-blur md:block">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Entropy Band</div>
              <div
                className={`text-2xl font-semibold ${
                  queueInfo.band === 'high'
                    ? 'text-emerald-300'
                    : queueInfo.band === 'mid'
                    ? 'text-sky-300'
                    : 'text-amber-300'
                }`}
              >
                {queueInfo.band.toUpperCase()}
              </div>
              <div className="text-[0.7rem] font-mono text-slate-500">Queue #{queueInfo.queueHash.slice(0, 8)}</div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-slate-100">Commit → Reveal</h2>
              <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
                SHA256 Queue
              </span>
            </div>
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Server Seed</span>
                <input
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={serverSeed}
                  onChange={(event) => setServerSeed(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Client Nonce</span>
                <input
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={clientNonce}
                  onChange={(event) => setClientNonce(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Round</span>
                <input
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  type="number"
                  value={round}
                  onChange={(event) => setRound(Number(event.target.value))}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Wheel Payout</span>
                <input
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  type="number"
                  step="0.01"
                  value={wheelPayout}
                  onChange={(event) => setWheelPayout(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="mt-5 space-y-3 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 text-xs text-slate-400">
              <div className="flex flex-wrap justify-between gap-2">
                <span>Commit Hash</span>
                <span className="font-mono text-slate-200">{sha256(serverSeed)}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span>Reveal Seed</span>
                <span className="font-mono text-slate-200">{revealSeed}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span>Queue Hash</span>
                <span className="font-mono text-slate-200">{queueInfo.queueHash}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span>Entropy Band</span>
                <span
                  className={`font-semibold ${
                    queueInfo.band === 'high'
                      ? 'text-emerald-300'
                      : queueInfo.band === 'mid'
                      ? 'text-sky-300'
                      : 'text-amber-300'
                  }`}
                >
                  {queueInfo.band.toUpperCase()}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-2 text-sm font-semibold text-slate-50 shadow-lg shadow-sky-500/30 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              onClick={handleReset}
            >
              Reset Ritual
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-slate-100">Turn State</h2>
              <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                {turnPhase.toUpperCase()}
              </span>
            </div>
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 shadow-inner shadow-slate-950/30">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Turns Remaining</div>
                <div className="mt-1 text-3xl font-semibold text-slate-100">{turnsRemaining}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 shadow-inner shadow-slate-950/30">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Score</div>
                <div className="mt-1 text-3xl font-semibold text-slate-100">{score.toFixed(0)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 shadow-inner shadow-slate-950/30">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Session Multiplier</div>
                <div className="mt-1 text-2xl font-semibold text-emerald-300">×{sessionBonus.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 shadow-inner shadow-slate-950/30">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Wheel Payout</div>
                <div className="mt-1 text-2xl font-semibold text-sky-300">×{wheelPayout.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-center">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Shards</div>
                <div className="text-lg font-semibold text-amber-200">{shardCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-center">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Royals</div>
                <div className="text-lg font-semibold text-violet-200">{royalMeter}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-center">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Combo Primed</div>
                <div className="text-lg font-semibold text-slate-100">
                  {comboBoostActive ? 'Ready' : 'Inactive'}
                </div>
              </div>
              <div className="col-span-3 rounded-2xl border border-slate-800/60 bg-slate-950/50 px-4 py-3">
                <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.3em] text-slate-400">
                  <span>Next Bonus Charge</span>
                  <span>{nextShardCountdown} shard{nextShardCountdown === 1 ? '' : 's'} out</span>
                </div>
                <div className="shard-meter mt-2">
                  <div
                    className="shard-meter-fill"
                    style={{ transform: `scaleX(${Math.min(Math.max(shardProgress, 0), 1)})` }}
                  />
                  <div className="shard-meter-glow" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-5 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-100">Ritual Board</h2>
                <p className="text-sm text-slate-400">Align sets, bloom glyphs, and channel cascades into the vault.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-300">
                <span className="rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1">Rotations left: {rotationsLeft}</span>
                <span className="rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1">Swap ready: {swapAvailable ? 'Yes' : 'No'}</span>
                <span className="rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1">Power ready: {powerAvailable ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="board-shell relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/40 p-4 shadow-inner shadow-slate-950/50">
              <div className="board-grid-overlay pointer-events-none absolute inset-0" />
              <div key={boardPulse} className="board-flash pointer-events-none absolute inset-0" />
              <div className="relative z-10 grid grid-cols-7 gap-2">
                {board.map((row, rowIdx) =>
                  row.map((cell, colIdx) => {
                    const isSelected = swapSelection.some(([r, c]) => r === rowIdx && c === colIdx);
                    const isPowerTarget =
                      powerMode === 'bomb' ? Boolean(cell) : powerMode === 'wild' ? !cell : false;
                    const cellKey = `${rowIdx}-${colIdx}`;
                    const isRecent = recentGlow.includes(cellKey);
                    const visuals = getSymbolVisuals(cell, { isSelected, isPowerTarget });
                    return (
                      <button
                        key={cellKey}
                        type="button"
                        onClick={() => handleCellClick(rowIdx, colIdx)}
                        className={`group relative flex aspect-square items-center justify-center rounded-xl text-2xl font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${isRecent ? 'tile-pop' : ''}`}
                        style={{
                          ...visuals,
                          transition: 'all 0.28s ease',
                          transform: isRecent ? 'translateY(-4px) scale(1.05)' : undefined,
                          boxShadow: isRecent
                            ? `${visuals.boxShadow}, 0 0 24px rgba(250, 204, 21, 0.45)`
                            : visuals.boxShadow,
                        }}
                      >
                        <span
                          className="relative z-10"
                          style={{
                            textShadow: cell ? '0 8px 24px rgba(15, 23, 42, 0.35)' : 'none',
                          }}
                        >
                          {cell ? cell.char : '•'}
                        </span>
                        {isRecent && (
                          <span className="tile-glow pointer-events-none absolute inset-0" />
                        )}
                        {cell && (
                          <span
                            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-30"
                            style={{
                              background:
                                'radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.35), transparent 60%)',
                              mixBlendMode: 'screen',
                            }}
                          />
                        )}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRotate}
                disabled={!activePiece || rotationsLeft <= 0 || turnPhase !== 'placing'}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-sky-500/30 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                Rotate Piece
              </button>
              <button
                type="button"
                onClick={() => dropPieceAt(activePiece ? activePiece.position.col : 0)}
                disabled={!activePiece || turnPhase !== 'placing'}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-emerald-500/30 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                Drop Centered
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!swapAvailable || turnPhase !== 'postPlacement') return;
                  startSwapMode();
                }}
                disabled={!swapAvailable || turnPhase !== 'postPlacement'}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-500/30 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                Swap Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!powerAvailable || powers.combo <= 0) return;
                  activateCombo();
                }}
                disabled={!powerAvailable || powers.combo <= 0}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-purple-500/30 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                Prime Combo (⚡)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!powerAvailable || powers.bomb <= 0 || turnPhase !== 'postPlacement') return;
                  setPowerMode('bomb');
                  setPowerAvailable(false);
                }}
                disabled={!powerAvailable || powers.bomb <= 0 || turnPhase !== 'postPlacement'}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-semibold text-slate-50 shadow-lg shadow-rose-500/30 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                Arcane Bomb (🧿)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!powerAvailable || powers.wild <= 0 || turnPhase !== 'postPlacement') return;
                  setPowerMode('wild');
                  setPowerAvailable(false);
                }}
                disabled={!powerAvailable || powers.wild <= 0 || turnPhase !== 'postPlacement'}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-emerald-500/30 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                Seed Wild (⭐)
              </button>
              <button
                type="button"
                onClick={endTurn}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-slate-900/40 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                disabled={turnPhase === 'placing'}
              >
                End Turn
              </button>
            </div>
            {powerMode && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {powerMode === 'bomb' && 'Select a cell to detonate the arcane cross.'}
                {powerMode === 'wild' && 'Select a target column to seed a falling wild.'}
              </div>
            )}
          </div>

          <div className="w-full space-y-4 lg:w-72">
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 shadow-glow backdrop-blur">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-100">Current Drop</h3>
                <span className="rounded-full border border-slate-700/50 bg-slate-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  {pieceTypeLabel}
                </span>
              </div>
              {activePreview ? (
                <>
                  <div
                    className="piece-preview mt-4 grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${activePreview.width}, minmax(0, 1fr))` }}
                  >
                    {activePreview.grid.map((previewRow, rIdx) =>
                      previewRow.map((symbol, cIdx) => {
                        const key = `${rIdx}-${cIdx}`;
                        const visuals = getSymbolVisuals(symbol);
                        return (
                          <span
                            key={key}
                            className="relative flex aspect-square items-center justify-center rounded-lg text-lg font-semibold"
                            style={{
                              ...visuals,
                              fontSize: symbol ? '1.35rem' : '0.95rem',
                              borderRadius: '0.85rem',
                              boxShadow: symbol ? visuals.boxShadow : 'inset 0 0 0 1px rgba(71, 85, 105, 0.35)',
                            }}
                          >
                            {symbol ? symbol.char : '·'}
                          </span>
                        );
                      }),
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {activePieceSummary.length > 0 ? (
                      activePieceSummary.map((item) => (
                        <span
                          key={item.label}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold ${
                            RARITY_ACCENTS[item.rarity] || 'border-slate-700/60 bg-slate-900/70 text-slate-200'
                          }`}
                        >
                          <span>{item.char}</span>
                          <span>{item.label}</span>
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-3 py-1 text-slate-300">
                        Pure glyph
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.3em] text-slate-400">
                    <span>Spawn column</span>
                    <span>{(activePiece?.position?.col || 0) + 1}</span>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-700/60 bg-slate-950/40 px-4 py-6 text-center text-xs text-slate-400">
                  Queue is weaving the next glyph...
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 shadow-glow backdrop-blur">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-100">Piece Queue</h3>
                <span className="text-xs font-mono text-slate-500">Next 10</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {queueInfo.entries.slice(queuePointer, queuePointer + 10).map((entry, idx) => {
                  const badgeVisuals = getSymbolVisuals(entry);
                  const isNext = idx === 0;
                  return (
                    <span
                      key={entry.index}
                      title={entry.label}
                      className={`queue-chip relative inline-flex items-center justify-center rounded-lg px-3 py-2 text-lg font-semibold shadow-inner shadow-slate-950/30 ${
                        isNext ? 'queue-chip--next' : ''
                      }`}
                      style={{
                        ...badgeVisuals,
                        borderRadius: '0.9rem',
                      }}
                    >
                      {entry.char}
                      {isNext && <span className="queue-chip-label">Next</span>}
                    </span>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-3 text-xs text-slate-400">
                RNG Seed: <span className="font-mono text-slate-200">{queueInfo.rngSeed}</span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 text-sm shadow-glow backdrop-blur">
              <h3 className="font-semibold text-slate-100">Powers Inventory</h3>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2">
                  <span>⭐ Wild Seeds</span>
                  <span className="font-semibold text-emerald-200">{powers.wild}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2">
                  <span>⚡ Combo Charges</span>
                  <span className="font-semibold text-purple-200">{powers.combo}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2">
                  <span>🧿 Arcane Bombs</span>
                  <span className="font-semibold text-rose-200">{powers.bomb}</span>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 text-sm shadow-glow backdrop-blur">
              <h3 className="font-semibold text-slate-100">Cascade Log</h3>
              <div className="scroll-track mt-3 max-h-48 space-y-3 overflow-y-auto pr-1">
                {cascadeLog.map((entry, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-3">
                    <div className="font-semibold text-slate-200">{entry.action}</div>
                    <div className="mt-2 space-y-1 text-xs text-slate-400">
                      {entry.cascades.map((c) => (
                        <div key={c.cascade}>
                          Cascade {c.cascade}: cleared {c.cleared}, +{c.scoreGain.toFixed(0)} pts
                          {c.royals > 0 && `, royal x${c.royals}`}
                          {c.legend && ', SIGIL BLOOM'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {cascadeLog.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/40 p-3 text-xs text-slate-500">
                    Cascades will be chronicled here once the ritual begins to flow.
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 text-sm shadow-glow backdrop-blur">
              <h3 className="font-semibold text-slate-100">Audit Journal</h3>
              <div className="scroll-track mt-3 max-h-40 space-y-2 overflow-y-auto pr-1 text-xs text-slate-300">
                {log.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2">
                    {item}
                  </div>
                ))}
                {log.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-950/30 px-3 py-2 text-slate-500">
                    Your actions will be logged in this ledger for provable fairness.
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950/80 p-5 text-sm shadow-glow backdrop-blur">
              <h3 className="font-semibold text-slate-100">Round Settlement</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Drop Multiplier</span>
                  <span>×{scoreToMultiplier(score).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Wheel Payout</span>
                  <span>×{wheelPayout.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Session Bonus</span>
                  <span>×{sessionBonus.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/60 pt-3 text-lg font-semibold text-slate-100">
                  <span>Total Payout</span>
                  <span>{turnsRemaining === 0 ? payout.toFixed(2) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 text-sm text-slate-300 shadow-glow backdrop-blur">
          <h3 className="font-display text-lg font-semibold text-slate-100">How to play this prototype</h3>
          <ul className="mt-3 grid gap-2 md:grid-cols-2 md:gap-3">
            <li className="rounded-2xl border border-slate-800/60 bg-slate-950/40 px-4 py-3">
              Each turn draws a tri or tetromino ritual piece from the commit-revealed queue.
            </li>
            <li className="rounded-2xl border border-slate-800/60 bg-slate-950/40 px-4 py-3">
              Rotate once, then drop into the 7×10 chamber. Cascades score using color matches and royal sets.
            </li>
            <li className="rounded-2xl border border-slate-800/60 bg-slate-950/40 px-4 py-3">
              After placement you can swap once or fire a stored power (⭐/⚡/🧿). Cascades refill the inventory.
            </li>
            <li className="rounded-2xl border border-slate-800/60 bg-slate-950/40 px-4 py-3">
              Crafted K emerges when J and Q touch. J-Q-K lines trigger Royal Flush bursts; add a 7 to bloom sigils.
            </li>
            <li className="rounded-2xl border border-slate-800/60 bg-slate-950/40 px-4 py-3">
              Collect 🪙 shards to raise the session multiplier (every three shards +0.25, capped at +1.00).
            </li>
            <li className="rounded-2xl border border-slate-800/60 bg-slate-950/40 px-4 py-3">
              Final payout = wheel result × drop multiplier × session bonus. All data is logged for audit.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default RitualDrop;
