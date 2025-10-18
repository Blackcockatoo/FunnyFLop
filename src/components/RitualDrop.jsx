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
  const rngRef = useRef(() => 0.5);
  const idRef = useRef(0);
  const queuePointerRef = useRef(0);

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
  }, []);

  const drawNextPiece = useCallback(() => {
    setRotationsLeft(1);
    setSwapAvailable(true);
    setPowerAvailable(true);
    setSwapSelection([]);
    setPowerMode(null);

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
    <div className="bg-slate-950 text-slate-100 min-h-screen p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Ritual Drop Prototype</h1>
        <p className="text-slate-400">Commit-reveal seeded symbol rain with cascades, royals, and glyph blooms.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-slate-900 rounded-lg p-4 space-y-3">
          <h2 className="text-xl font-semibold">Commit → Reveal</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-slate-400">Server Seed</span>
              <input
                className="bg-slate-800 rounded px-3 py-2"
                value={serverSeed}
                onChange={(event) => setServerSeed(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-400">Client Nonce</span>
              <input
                className="bg-slate-800 rounded px-3 py-2"
                value={clientNonce}
                onChange={(event) => setClientNonce(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-400">Round</span>
              <input
                className="bg-slate-800 rounded px-3 py-2"
                type="number"
                value={round}
                onChange={(event) => setRound(Number(event.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-400">Wheel Payout</span>
              <input
                className="bg-slate-800 rounded px-3 py-2"
                type="number"
                step="0.01"
                value={wheelPayout}
                onChange={(event) => setWheelPayout(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="text-xs text-slate-400">
            <div>Commit Hash: <span className="font-mono text-slate-200">{sha256(serverSeed)}</span></div>
            <div>Reveal Seed: <span className="font-mono text-slate-200">{revealSeed}</span></div>
            <div>Queue Hash: <span className="font-mono text-slate-200">{queueInfo.queueHash}</span></div>
            <div>Entropy Band: <span className="uppercase text-indigo-300">{queueInfo.band}</span></div>
          </div>
          <button
            type="button"
            className="bg-indigo-600 hover:bg-indigo-500 transition-colors px-4 py-2 rounded"
            onClick={handleReset}
          >
            Reset Ritual
          </button>
        </div>

        <div className="bg-slate-900 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Turn State</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-400">Turns Remaining</div>
              <div className="text-2xl font-bold">{turnsRemaining}</div>
            </div>
            <div>
              <div className="text-slate-400">Phase</div>
              <div className="text-2xl font-bold capitalize">{turnPhase}</div>
            </div>
            <div>
              <div className="text-slate-400">Score</div>
              <div className="text-2xl font-bold">{score.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-slate-400">Session Multiplier</div>
              <div className="text-2xl font-bold">×{sessionBonus.toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-slate-400">Shards</div>
              <div className="text-xl">{shardCount}</div>
            </div>
            <div>
              <div className="text-slate-400">Royals Collected</div>
              <div className="text-xl">{royalMeter}</div>
            </div>
            <div>
              <div className="text-slate-400">Combo Primed?</div>
              <div className="text-xl">{comboBoostActive ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="bg-slate-900 rounded-lg p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Ritual Board</h2>
            <div className="flex gap-2 text-xs text-slate-400">
              <span>Rotations left: {rotationsLeft}</span>
              <span>Swap ready: {swapAvailable ? 'Yes' : 'No'}</span>
              <span>Power ready: {powerAvailable ? 'Yes' : 'No'}</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 bg-slate-800 p-2 rounded">
            {board.map((row, rowIdx) =>
              row.map((cell, colIdx) => (
                <button
                  key={`${rowIdx}-${colIdx}`}
                  type="button"
                  onClick={() => handleCellClick(rowIdx, colIdx)}
                  className={`aspect-square flex items-center justify-center rounded text-2xl transition-colors ${
                    cell
                      ? 'bg-slate-700 hover:bg-slate-600'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-700'
                  } ${
                    swapSelection.some(([r, c]) => r === rowIdx && c === colIdx)
                      ? 'ring-2 ring-amber-400'
                      : ''
                  }`}
                >
                  {cell ? cell.char : '•'}
                </button>
              )),
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRotate}
              disabled={!activePiece || rotationsLeft <= 0 || turnPhase !== 'placing'}
              className="px-4 py-2 rounded bg-blue-600 disabled:bg-slate-700"
            >
              Rotate Piece
            </button>
            <button
              type="button"
              onClick={() => dropPieceAt(activePiece ? activePiece.position.col : 0)}
              disabled={!activePiece || turnPhase !== 'placing'}
              className="px-4 py-2 rounded bg-emerald-600 disabled:bg-slate-700"
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
              className="px-4 py-2 rounded bg-amber-600 disabled:bg-slate-700"
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
              className="px-4 py-2 rounded bg-purple-600 disabled:bg-slate-700"
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
              className="px-4 py-2 rounded bg-rose-600 disabled:bg-slate-700"
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
              className="px-4 py-2 rounded bg-teal-600 disabled:bg-slate-700"
            >
              Seed Wild (⭐)
            </button>
            <button
              type="button"
              onClick={endTurn}
              className="px-4 py-2 rounded bg-slate-700"
              disabled={turnPhase === 'placing'}
            >
              End Turn
            </button>
          </div>
          {powerMode && (
            <div className="mt-2 text-sm text-amber-300">
              {powerMode === 'bomb' && 'Select a cell to detonate the arcane cross.'}
              {powerMode === 'wild' && 'Select a column cell to seed a falling wild.'}
            </div>
          )}
        </div>

        <div className="w-full md:w-72 space-y-4">
          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Piece Queue</h3>
            <div className="flex flex-wrap gap-2 text-2xl">
              {queueInfo.entries.slice(queuePointer, queuePointer + 10).map((entry) => (
                <span key={entry.index} title={entry.label}>
                  {entry.char}
                </span>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              RNG Seed: <span className="font-mono text-slate-200">{queueInfo.rngSeed}</span>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 text-sm space-y-2">
            <h3 className="font-semibold">Powers Inventory</h3>
            <div className="flex justify-between"><span>⭐ Wild Seeds</span><span>{powers.wild}</span></div>
            <div className="flex justify-between"><span>⚡ Combo Charges</span><span>{powers.combo}</span></div>
            <div className="flex justify-between"><span>🧿 Arcane Bombs</span><span>{powers.bomb}</span></div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 text-sm space-y-2">
            <h3 className="font-semibold">Cascade Log</h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {cascadeLog.map((entry, idx) => (
                <div key={idx} className="bg-slate-800 rounded p-2">
                  <div className="font-semibold">{entry.action}</div>
                  {entry.cascades.map((c) => (
                    <div key={c.cascade} className="text-xs text-slate-400">
                      Cascade {c.cascade}: cleared {c.cleared}, +{c.scoreGain.toFixed(0)} pts
                      {c.royals > 0 && `, royal x${c.royals}`}
                      {c.legend && ', SIGIL BLOOM'}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 text-sm space-y-2">
            <h3 className="font-semibold">Audit Journal</h3>
            <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-slate-300">
              {log.map((item, idx) => (
                <div key={idx}>{item}</div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 text-sm">
            <h3 className="font-semibold mb-2">Round Settlement</h3>
            <div className="flex justify-between"><span>Drop Multiplier</span><span>×{scoreToMultiplier(score).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Wheel Payout</span><span>×{wheelPayout.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Session Bonus</span><span>×{sessionBonus.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-lg mt-2">
              <span>Total Payout</span>
              <span>{turnsRemaining === 0 ? payout.toFixed(2) : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 space-y-2">
        <h3 className="font-semibold text-slate-100">How to play this prototype</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Each turn draws a tri or tetromino ritual piece from the commit-revealed queue.</li>
          <li>Rotate once, then drop into the 7×10 chamber. Cascades score using color matches and royal sets.</li>
          <li>After placement you can swap once or fire a stored power (⭐/⚡/🧿). Cascades refill the inventory.</li>
          <li>Crafted K emerges when J and Q touch. J-Q-K lines trigger Royal Flush bursts; add a 7 to bloom sigils.</li>
          <li>Collect 🪙 shards to raise the session multiplier (every three shards +0.25, capped at +1.00).</li>
          <li>Final payout = wheel result × drop multiplier × session bonus. All data is logged for audit.</li>
        </ul>
      </div>
    </div>
  );
};

export default RitualDrop;
