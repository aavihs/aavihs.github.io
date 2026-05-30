// ─── State ────────────────────────────────────────────────────────────────────

let whiteToMove = true;
let selectedSquare = null;
let board = [];
let futureBoard = [];
let boardPrev = [];
let history = [];
let routes = [];
let futureRoutes = [];
let blocked = null;
let lastMove = null;
let gameOver = false;

let BKRhasMoved = 0;
let BQRhasMoved = 0;
let BKhasMoved = 0;
let WKRhasMoved = 0;
let WQRhasMoved = 0;
let WKhasMoved = 0;
let BKSideBlocked = 1;
let BQSideBlocked = 1;
let WKSideBlocked = 1;
let WQSideBlocked = 1;
let BKSideChecked = 0;
let BQSideChecked = 0;
let WKSideChecked = 0;
let WQSideChecked = 0;
let wCanCastleKQ = [0, 0];
let bCanCastleKQ = [0, 0];

let enPassantMeWhite = [0, 0, 0, 0, 0, 0, 0, 0];
let enPassantMeBlack = [0, 0, 0, 0, 0, 0, 0, 0];
let check = 0;
let toCheck = 0;
let lastCheck = 0;
let k = 0;
let squaresRank = [];
let squaresFile = [];
let squaresDiagonal = [];
let enPassantId = null;

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS = "ABCDEFGH";

const PIECES = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};
// prettier-ignore
const SETUP = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  [" ", " ", " ", " ", " ", " ", " ", " "],
  [" ", " ", " ", " ", " ", " ", " ", " "],
  [" ", " ", " ", " ", " ", " ", " ", " "],
  [" ", " ", " ", " ", " ", " ", " ", " "],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"],
];

//prettier-ignore

const LINES = [
  ["9999","9999","9999","9999","9999","9999","9999","9999","9999","9999"],
  ["9999","9999","9999","9999","9999","9999","9999","9999","9999","9999"],
  ["9999","81AW","82BX","83CY","84DZ","85E1","86F2","87G3","88H4","9999"],
  ["9999","71BV","72CW","73DX","74EY","75FZ","76G1","77H2","78I3","9999"],
  ["9999","61CU","62DV","63EW","64FX","65GY","66HZ","67I1","68J2","9999"],
  ["9999","51DT","52EU","53FV","54GW","55HX","56IY","57JZ","58K1","9999"],
  ["9999","41ES","42FT","43GU","44HV","45IW","46JX","47KY","48LZ","9999"],
  ["9999","31FR","32GS","33HT","34IU","35JV","36KW","37LX","38MY","9999"],
  ["9999","21GQ","22HR","23IS","24JT","25KU","26LV","27MW","28NX","9999"],
  ["9999","11HP","12IQ","13JR","14KS","15LT","16MU","17NV","18OW","9999"],
  ["9999","9999","9999","9999","9999","9999","9999","9999","9999","9999"],
  ["9999","9999","9999","9999","9999","9999","9999","9999","9999","9999"],
];

board = structuredClone(SETUP);

// ─── Route Object Helper ──────────────────────────────────────────────────────

function makeRoute({
  fromRank,
  fromFile,
  toRank,
  toFile,
  fromCode,
  toCode,
  fromId,
  toId,
  canRook,
  canBishop,
  canQueen,
  canKnight,
  canKing,
  fromRow,
  fromCol,
  canBlackPawn,
  canWhitePawn,
  toRow,
  toCol,
  isBlocked,
  check,
  lastCheck,
  enPassantId,
}) {
  return {
    fromRank,
    fromFile,
    toRank,
    toFile,
    fromCode,
    toCode,
    fromId,
    toId,
    canRook,
    canBishop,
    canQueen,
    canKnight,
    canKing,
    fromRow,
    fromCol,
    canBlackPawn,
    canWhitePawn,
    toRow,
    toCol,
    isBlocked,
    check,
    lastCheck,
    enPassantId,
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function squareId(col, row) {
  return COLS[col] + (8 - row).toString();
}

function renderBoard() {
  for (let row = 0; row <= 7; row++) {
    for (let col = 0; col <= 7; col++) {
      const el = document.getElementById(squareId(col, row));
      el.textContent = PIECES[board[row][col]] ?? "";
    }
  }
}

// ─── Game Actions ─────────────────────────────────────────────────────────────

function resetGame() {
  board = structuredClone(SETUP);
  renderBoard();
  adjustRoutes();
  history = [];
  routes = [];
  whiteToMove = true;
  lastMove = null;
  gameOver = false;
  document.querySelectorAll("#display div").forEach((el) => el.remove());
  alert("Game reset!");
}

function undoMove() {
  // debugger;
  board = structuredClone(boardPrev);
  renderBoard();
  adjustRoutes();

  whiteToMove = !whiteToMove;

  if (whiteToMove) {
    const parent = document.getElementById("display");
    parent.lastElementChild.remove();
    history.pop();
  } else {
    lastMove = lastMove.split("     ")[0];
    const moveLine = document.getElementById("Move" + history.length);
    moveLine.textContent = (history.length + ". " + lastMove).trim();
  }
}

// ─── Route Calculation ────────────────────────────────────────────────────────

/**
 * Returns true if any piece sits between fromCol and toCol on the given row.
 */
function isRankBlocked(row, fromCol, toCol) {
  const lo = Math.min(fromCol, toCol);
  const hi = Math.max(fromCol, toCol);
  for (let c = lo + 1; c < hi; c++) {
    if (board[row][c] !== " ") return true;
  }
  return false;
}

/**
 * Returns true if any piece sits between fromRow and toRow on the given col.
 */
function isFileBlocked(col, fromRow, toRow) {
  const lo = Math.min(fromRow, toRow);
  const hi = Math.max(fromRow, toRow);
  for (let r = lo + 1; r < hi; r++) {
    if (board[r][col] !== " ") return true;
  }
  return false;
}

/**
 * Returns true if any piece sits between two squares on a diagonal.
 * fileDir: +1 or -1 depending on which diagonal direction.
 */
function isDiagonalBlocked(fromRow, fromCol, toRow, fileDir) {
  const steps = Math.abs(toRow - fromRow);
  const rowDir = toRow > fromRow ? 1 : -1;
  for (let i = 1; i < steps; i++) {
    const r = fromRow + rowDir * i;
    const c = fromCol + fileDir * i;
    if (board[r][c] !== " ") return true;
  }
  return false;
}

/**
 * Returns a list of squares in between two squares.
 */

function listSquaresRankRoute(row, fromCol, toCol) {
  squaresRank = [];
  const lo = Math.min(fromCol, toCol);
  const hi = Math.max(fromCol, toCol);
  for (let c = lo + 1; c < hi; c++) {
    const q = [row, c];
    squaresRank.push(q);
  }
  return squaresRank;
}

function listSquaresFileRoute(col, fromRow, toRow) {
  squaresFile = [];
  const lo = Math.min(fromRow, toRow);
  const hi = Math.max(fromRow, toRow);
  for (let r = lo + 1; r < hi; r++) {
    const q = [r, col];
    squaresFile.push(q);
  }
  return squaresFile;
}

function listSquaresDiagonalRoute(fromRow, fromCol, toRow, toCol) {
  let squaresDiagonal = [];

  const steps = Math.abs(toRow - fromRow);
  const rowDir = toRow > fromRow ? 1 : -1;
  const fileDir = toCol > fromCol ? 1 : -1;

  for (let i = 1; i < steps; i++) {
    const r = fromRow + rowDir * i;
    const c = fromCol + fileDir * i;
    const q = [r, c];

    squaresDiagonal.push(q);
  }

  return squaresDiagonal;
}

function canBeBlockedOrTaken(a, b, c, d, kingColor) {
  let pieceAttacker = board[a][b].toUpperCase();
  let blockersBlack = 0;
  let blockersWhite = 0;
  let inBetween = [];
  let canBeTaken = 0;

  if (kingColor == "B") {
    canBeTaken = routes.filter(
      (t) =>
        t.toRow === a &&
        t.toCol === b &&
        routes.some(
          (a) =>
            a.toRow === t.toRow &&
            a.toCol === t.toCol &&
            !a.isBlocked &&
            ((board[a.fromRow][a.fromCol] === "b" && a.canBishop) ||
              (board[a.fromRow][a.fromCol] === "r" && a.canRook) ||
              (board[a.fromRow][a.fromCol] === "q" && a.canQueen) ||
              (board[a.fromRow][a.fromCol] === "n" && a.canKnight) ||
              (board[a.fromRow][a.fromCol] === "p" && a.canBlackPawn)),
        ),
    ).length;
  } else {
    canBeTaken = routes.filter(
      (t) =>
        t.toRow === a &&
        t.toCol === b &&
        routes.some(
          (a) =>
            a.toRow === t.toRow &&
            a.toCol === t.toCol &&
            !a.isBlocked &&
            ((board[a.fromRow][a.fromCol] === "B" && a.canBishop) ||
              (board[a.fromRow][a.fromCol] === "R" && a.canRook) ||
              (board[a.fromRow][a.fromCol] === "Q" && a.canQueen) ||
              (board[a.fromRow][a.fromCol] === "N" && a.canKnight) ||
              (board[a.fromRow][a.fromCol] === "P" && a.canWhitePawn)),
        ),
    ).length;
  }

  if (a == c && (pieceAttacker == "R" || pieceAttacker == "Q")) {
    inBetween = listSquaresRankRoute(a, b, d);
  } else if (b == d && (pieceAttacker == "R" || pieceAttacker == "Q")) {
    inBetween = listSquaresFileRoute(d, a, c);
  } else if (
    Math.abs(a - c) == Math.abs(b - d) &&
    (pieceAttacker == "B" || pieceAttacker == "Q")
  ) {
    inBetween = listSquaresDiagonalRoute(a, b, c, d);
  }

  if (!inBetween || inBetween.length === 0) return false;

  if (kingColor == "B") {
    for (i = 0; i < inBetween.length; i++) {
      blockersBlack = routes.filter(
        (r) =>
          r.toRow === inBetween[i][0] &&
          r.toCol === inBetween[i][1] &&
          !r.isBlocked &&
          routes.some(
            (a) =>
              a.toRow === r.toRow &&
              a.toCol === r.toCol &&
              !a.isBlocked &&
              ((board[a.fromRow][a.fromCol] === "b" && a.canBishop) ||
                (board[a.fromRow][a.fromCol] === "r" && a.canRook) ||
                (board[a.fromRow][a.fromCol] === "q" && a.canQueen) ||
                (board[a.fromRow][a.fromCol] === "n" && a.canKnight) ||
                (board[a.fromRow][a.fromCol] === "p" && a.canBlackPawn)),
          ),
      ).length;
      if (blockersBlack > 0) {
        break;
      }
    }
  } else {
    for (i = 0; i < inBetween.length - 1; i++) {
      blockersWhite = routes.filter(
        (r) =>
          r.toRow == inBetween[i][0] &&
          r.toCol === inBetween[i][1] &&
          !r.isBlocked &&
          routes.some(
            (a) =>
              a.toRow === r.toRow &&
              a.toCol === r.toCol &&
              !a.isBlocked &&
              ((board[a.fromRow][a.fromCol] === "B" && a.canBishop) ||
                (board[a.fromRow][a.fromCol] === "R" && a.canRook) ||
                (board[a.fromRow][a.fromCol] === "Q" && a.canQueen) ||
                (board[a.fromRow][a.fromCol] === "N" && a.canKnight) ||
                (board[a.fromRow][a.fromCol] === "P" && a.canWhitePawn)),
          ),
      ).length;
      if (blockersWhite > 0) {
        break;
      }
    }
  }

  if (
    (kingColor == "W" && (blockersWhite > 0 || canBeTaken != 0)) ||
    (kingColor == "B" && (blockersBlack > 0 || canBeTaken != 0))
  ) {
    return true;
  } else {
    return false;
  }
}

/**
 * Rebuilds the full routes table and marks squares in check.
 * Called after every move and on initial square selection.
 */
``;
function adjustRoutes() {
  routes = [];
  document
    .querySelectorAll(".check")
    .forEach((el) => el.classList.remove("check"));

  for (let r = 0; r <= 7; r++) {
    for (let c = 0; c <= 7; c++) {
      for (let s = 0; s <= 7; s++) {
        for (let d = 0; d <= 7; d++) {
          check = 0;
          const fromCode = LINES[r + 2][c + 1];
          const toCode = LINES[s + 2][d + 1];
          const fromRank = parseInt(fromCode[0]);
          const fromFile = parseInt(fromCode[1]);
          const toRank = parseInt(toCode[0]);
          const toFile = parseInt(toCode[1]);

          let canRook = false;
          let canBishop = false;
          let canQueen = false;
          let canKnight = false;
          let canKing = false;
          let canBlackPawn = false;
          let canWhitePawn = false;
          let isBlocked = false;
          let enPassantId = null;

          // ── Rook / Queen (same rank = same row) ───────────────────────────
          if (fromRank === toRank) {
            if (Math.abs(c - d) > 1) {
              isBlocked = isRankBlocked(r, c, d);
            }
            canRook = true;
            canQueen = true;
          }

          // ── Rook / Queen (same file = same col) ───────────────────────────
          if (fromFile === toFile) {
            if (Math.abs(r - s) > 1) {
              isBlocked = isFileBlocked(c, r, s);
            }
            canRook = true;
            canQueen = true;
          }

          // ── Bishop / Queen (same "/" diagonal, code[2]) ───────────────────
          if (fromCode[2] === toCode[2]) {
            const fileDir = toRank < fromRank ? -1 : 1;
            if (Math.abs(r - s) > 1) {
              isBlocked = isDiagonalBlocked(r, c, s, fileDir);
            }
            canBishop = true;
            canQueen = true;
          }

          // ── Bishop / Queen (same "\" diagonal, code[3]) ───────────────────
          if (fromCode[3] === toCode[3]) {
            const fileDir = toRank < fromRank ? 1 : -1;
            if (Math.abs(r - s) > 1) {
              isBlocked = isDiagonalBlocked(r, c, s, fileDir);
            }
            canBishop = true;
            canQueen = true;
          }

          // ── King (one step in any direction) ──────────────────────────────
          const rankFileDiff =
            fromRank * 10 + fromFile - (toRank * 10 + toFile);
          const kingDeltas = [1, -1, 10, -10, 11, -11, 9, -9];
          if (kingDeltas.includes(rankFileDiff)) {
            canKing = true;
          }

          if (
            board[r][c] == "K" &&
            r == 7 &&
            c == 4 &&
            s == 7 &&
            d == 2 &&
            wCanCastleKQ[1] == 1 &&
            WQSideChecked == 0 &&
            WQSideBlocked == 0
          ) {
            canKing = true;
            isBlocked = false;
          }
          if (
            board[r][c] == "K" &&
            r == 7 &&
            c == 4 &&
            s == 7 &&
            d == 6 &&
            wCanCastleKQ[0] == 1 &&
            WKSideChecked == 0 &&
            WKSideBlocked == 0
          ) {
            canKing = true;
            isBlocked = false;
          }

          if (
            board[r][c] == "k" &&
            r == 0 &&
            c == 4 &&
            s == 0 &&
            d == 2 &&
            bCanCastleKQ[1] == 1 &&
            BQSideChecked == 0 &&
            BQSideBlocked == 0
          ) {
            canKing = true;
            isBlocked = false;
          }

          if (board[r][c] == "k") {
          }
          if (
            board[r][c] == "k" &&
            r == 0 &&
            c == 4 &&
            s == 0 &&
            d == 6 &&
            bCanCastleKQ[0] == 1 &&
            BKSideChecked == 0 &&
            BKSideBlocked == 0
          ) {
            canKing = true;
            isBlocked = false;
          }

          // ── Knight (L-shapes) ─────────────────────────────────────────────
          const knightDeltas = [12, -12, 21, -21, 19, -19, 8, -8];
          if (knightDeltas.includes(rankFileDiff)) {
            canKnight = true;
          }

          // ── Same square — no piece can move here ──────────────────────────
          if (r === s && c === d) {
            canRook = canBishop = canQueen = canKing = canKnight = false;
          }

          // ── Black pawn ────────────────────────────────────────────────────
          if (fromRank === toRank + 1 && Math.abs(fromFile - toFile) <= 1) {
            if (fromFile !== toFile && board[s][d] !== " ") canBlackPawn = true; // capture
            if (fromFile === toFile && board[s][d] === " ") canBlackPawn = true; // advance
          }
          if (
            fromRank === toRank + 2 &&
            fromFile === toFile &&
            fromRank === 7
          ) {
            if (board[s][d] === " ") {
              if (board[s - 1][d] !== " ") isBlocked = true;
              canBlackPawn = true;
            }
          }

          // ── White pawn ────────────────────────────────────────────────────
          if (fromRank === toRank - 1 && Math.abs(fromFile - toFile) <= 1) {
            if (fromFile !== toFile && board[s][d] !== " ") canWhitePawn = true; // capture
            if (fromFile === toFile && board[s][d] === " ") canWhitePawn = true; // advance
          }

          if (
            fromRank === toRank - 2 &&
            fromFile === toFile &&
            fromRank === 2
          ) {
            if (board[s][d] === " ") {
              if (board[s + 1][d] !== " ") isBlocked = true;
              canWhitePawn = true;
            }
          }

          // ──En passant────────────────────────────────────────────────────

          if (
            r === 4 &&
            s === 5 &&
            Math.abs(c - d) == 1 &&
            board[s][d] === " " &&
            board[r][c] === "p"
          ) {
            if (board[r][d] === "P" && enPassantMeWhite[d] == 1) {
              isBlocked = false;
              canBlackPawn = true;
              enPassantId = squareId(d, r);
            }
          }
          if (
            r === 3 &&
            s === 2 &&
            Math.abs(c - d) == 1 &&
            board[s][d] === " " &&
            board[r][c] === "P"
          ) {
            if (board[r][d] === "p" && enPassantMeBlack[d] == 1) {
              isBlocked = false;
              canWhitePawn = true;
              enPassantId = squareId(d, r);
            }
          }

          // ── Check detection ───────────────────────────────────────────────
          const fromPiece = board[r][c];
          const toPiece = board[s][d];

          const canAttack =
            (fromPiece.toUpperCase() === "R" && canRook) ||
            (fromPiece.toUpperCase() === "B" && canBishop) ||
            (fromPiece.toUpperCase() === "Q" && canQueen) ||
            (fromPiece.toUpperCase() === "N" && canKnight) ||
            (fromPiece.toUpperCase() === "P" && canWhitePawn) ||
            (fromPiece.toUpperCase() === "P" && canBlackPawn);

          if (fromPiece !== " " && !isBlocked && canAttack) {
            const fromIsWhite = fromPiece === fromPiece.toUpperCase();
            if (fromIsWhite && toPiece === "k") {
              debugger;
              document.getElementById(squareId(d, s)).classList.add("check");
              check = 1;
            }
            if (!fromIsWhite && toPiece === "K") {
              document.getElementById(squareId(d, s)).classList.add("check");
              check = 2;
            }
          }

          routes.push(
            makeRoute({
              fromRank,
              fromFile,
              toRank,
              toFile,
              fromCode,
              toCode,
              fromId: squareId(c, r),
              toId: squareId(d, s),
              canRook,
              canBishop,
              canQueen,
              canKnight,
              canKing,
              fromRow: r,
              fromCol: c,
              canBlackPawn,
              canWhitePawn,
              toRow: s,
              toCol: d,
              isBlocked,
              check,
              lastCheck,
              enPassantId,
            }),
          );
        }
      }
    }
  }
}

// ─── Move Highlighting ────────────────────────────────────────────────────────

function isLegalMove(route) {
  const piece = board[route.fromRow][route.fromCol];
  if (piece === " ") return false;

  if (
    piece == "k" &&
    route.fromId == "E8" &&
    route.toId == "G8" &&
    bCanCastleKQ[0] == 1
  )
    return true;
  if (
    piece == "k" &&
    route.fromId == "E8" &&
    route.toId == "C8" &&
    bCanCastleKQ[1] == 1
  )
    return true;
  if (
    piece == "K" &&
    route.fromId == "E1" &&
    route.toId == "G1" &&
    wCanCastleKQ[0] == 1
  )
    return true;
  if (
    piece == "K" &&
    route.fromId == "E1" &&
    route.toId == "C1" &&
    wCanCastleKQ[1] == 1
  )
    return true;

  const pieceUpper = piece.toUpperCase();
  const isWhitePiece = piece === pieceUpper;
  const targetPiece = board[route.toRow][route.toCol];

  const canMove =
    (pieceUpper === "B" && route.canBishop && !route.isBlocked) ||
    (pieceUpper === "R" && route.canRook && !route.isBlocked) ||
    (pieceUpper === "Q" && route.canQueen && !route.isBlocked) ||
    (pieceUpper === "N" && route.canKnight) ||
    (pieceUpper === "K" && route.canKing) ||
    (piece === "p" && route.canBlackPawn) ||
    (piece === "P" && route.canWhitePawn);

  if (!canMove) return false;

  if (targetPiece !== " ") {
    const targetIsWhite = targetPiece === targetPiece.toUpperCase();
    if (isWhitePiece === targetIsWhite) return false;
  }

  return true;
}

function highlightMoves(fromId) {
  for (const route of routes) {
    if (route.fromId !== fromId) continue;
    if (!isLegalMove(route)) continue;

    toCheck = 0;

    const piece = board[route.fromRow][route.fromCol];
    const isWhitePiece = piece === piece.toUpperCase();
    const targetPiece = board[route.toRow][route.toCol];

    if (!whiteToMove && piece == "k") {
      toCheck = routes.filter(
        (k) =>
          k.toId == route.toId &&
          !k.isBlocked &&
          ((board[k.fromRow][k.fromCol] === "B" && k.canBishop) ||
            (board[k.fromRow][k.fromCol] === "R" && k.canRook) ||
            (board[k.fromRow][k.fromCol] === "Q" && k.canQueen) ||
            (board[k.fromRow][k.fromCol] === "N" && k.canKnight) ||
            (board[k.fromRow][k.fromCol] === "P" && k.canWhitePawn)),
      ).length;
    }

    if (whiteToMove && piece == "K") {
      toCheck = routes.filter(
        (k) =>
          k.toId == route.toId &&
          !k.isBlocked &&
          ((board[k.fromRow][k.fromCol] === "b" && k.canBishop) ||
            (board[k.fromRow][k.fromCol] === "r" && k.canRook) ||
            (board[k.fromRow][k.fromCol] === "q" && k.canQueen) ||
            (board[k.fromRow][k.fromCol] === "n" && k.canKnight) ||
            (board[k.fromRow][k.fromCol] === "p" && k.canBlackPawn)),
      ).length;
    }

    if (whiteToMove && isWhitePiece && toCheck == 0) {
      const targetIsEmpty = targetPiece === " ";
      const targetIsBlack =
        targetPiece !== " " && targetPiece === targetPiece.toLowerCase();
      if (targetIsEmpty || targetIsBlack) {
        document.getElementById(route.toId).classList.add("move");
      }
    }
    if (!whiteToMove && !isWhitePiece && toCheck == 0) {
      const targetIsEmpty = targetPiece === " ";
      const targetIsWhite =
        targetPiece !== " " && targetPiece === targetPiece.toUpperCase();
      if (targetIsEmpty || targetIsWhite) {
        document.getElementById(route.toId).classList.add("move");
      }
    }
  }
}

function castlingCheck(ms, wm, from) {
  if (ms == "m") {
    if (wm == true) {
      if (from == "A1") {
        WQRhasMoved = 1;
      }

      if (from == "E1") {
        WKhasMoved = 1;
      }
      if (from == "H1") {
        WKRhasMoved = 1;
      }
    } else {
      if (from == "A8") {
        BQRhasMoved = 1;
      }
      if (from == "E8") {
        BKhasMoved = 1;
      }
      if (from == "H8") {
        BKRhasMoved = 1;
      }
    }
  }

  if (board[7][1] == " " && board[7][2] == " " && board[7][3] == " ") {
    WQSideBlocked = 0;
  } else {
    WQSideBlocked = 1;
  }
  if (board[7][5] == " " && board[7][6] == " ") {
    WKSideBlocked = 0;
  } else {
    WKSideBlocked = 1;
  }

  WQSideChecked = routes.filter(
    (w) =>
      w.toRow == 7 &&
      w.toCol >= 2 &&
      w.toCol <= 4 &&
      !w.isBlocked &&
      ((board[w.fromRow][w.fromCol] === "b" && w.canBishop) ||
        (board[w.fromRow][w.fromCol] === "r" && w.canRook) ||
        (board[w.fromRow][w.fromCol] === "q" && w.canQueen) ||
        (board[w.fromRow][w.fromCol] === "n" && w.canKnight) ||
        (board[w.fromRow][w.fromCol] === "k" && w.canKing) ||
        (board[w.fromRow][w.fromCol] === "p" && w.canBlackPawn)),
  ).length;

  WKSideChecked = routes.filter(
    (x) =>
      x.toRow == 7 &&
      x.toCol >= 4 &&
      x.toCol <= 6 &&
      !x.isBlocked &&
      ((board[x.fromRow][x.fromCol] === "b" && x.canBishop) ||
        (board[x.fromRow][x.fromCol] === "r" && x.canRook) ||
        (board[x.fromRow][x.fromCol] === "q" && x.canQueen) ||
        (board[x.fromRow][x.fromCol] === "n" && x.canKnight) ||
        (board[x.fromRow][x.fromCol] === "k" && x.canKing) ||
        (board[x.fromRow][x.fromCol] === "p" && x.canBlackPawn)),
  ).length;

  if (board[0][1] == " " && board[0][2] == " " && board[0][3] == " ") {
    BQSideBlocked = 0;
  } else {
    BQSideBlocked = 1;
  }

  if (board[0][5] == " " && board[0][6] == " ") {
    BKSideBlocked = 0;
  } else {
    BKSideBlocked = 1;
  }

  BQSideChecked = routes.filter(
    (b) =>
      b.toRow == 0 &&
      b.toCol >= 2 &&
      b.toCol <= 4 &&
      !b.isBlocked &&
      ((board[b.fromRow][b.fromCol] === "B" && b.canBishop) ||
        (board[b.fromRow][b.fromCol] === "R" && b.canRook) ||
        (board[b.fromRow][b.fromCol] === "Q" && b.canQueen) ||
        (board[b.fromRow][b.fromCol] === "N" && b.canKnight) ||
        (board[b.fromRow][b.fromCol] === "K" && b.canKing) ||
        (board[b.fromRow][b.fromCol] === "P" && b.canWhitePawn)),
  ).length;

  BKSideChecked = routes.filter(
    (c) =>
      c.toRow == 0 &&
      c.toCol >= 4 &&
      c.toCol <= 6 &&
      !c.isBlocked &&
      ((board[c.fromRow][c.fromCol] === "B" && c.canBishop) ||
        (board[c.fromRow][c.fromCol] === "R" && c.canRook) ||
        (board[c.fromRow][c.fromCol] === "Q" && c.canQueen) ||
        (board[c.fromRow][c.fromCol] === "N" && c.canKnight) ||
        (board[c.fromRow][c.fromCol] === "K" && c.canKing) ||
        (board[c.fromRow][c.fromCol] === "P" && c.canWhitePawn)),
  ).length;

  if (
    BQSideChecked == 0 &&
    BQSideBlocked == 0 &&
    BQRhasMoved == 0 &&
    BKhasMoved == 0
  ) {
    bCanCastleKQ[1] = 1;
  } else {
    bCanCastleKQ[1] = 0;
  }

  if (
    BKSideChecked == 0 &&
    BKSideBlocked == 0 &&
    BKRhasMoved == 0 &&
    BKhasMoved == 0
  ) {
    bCanCastleKQ[0] = 1;
  } else {
    bCanCastleKQ[0] = 0;
  }
  if (
    WQSideChecked == 0 &&
    WQSideBlocked == 0 &&
    WQRhasMoved == 0 &&
    WKhasMoved == 0
  ) {
    wCanCastleKQ[1] = 1;
  } else {
    wCanCastleKQ[1] = 0;
  }
  if (
    WKSideChecked == 0 &&
    WKSideBlocked == 0 &&
    WKRhasMoved == 0 &&
    WKhasMoved == 0
  ) {
    wCanCastleKQ[0] = 1;
  } else {
    wCanCastleKQ[0] = 0;
  }

  return 0;
}

// ─── Checkmate Detection ──────────────────────────────────────────────────────

function checkForCheckmate() {
  // 1. Can the white king move to any safe square?

  const whiteKMoves = routes.filter((r) => {
    if (board[r.fromRow][r.fromCol] !== "K") return false;
    if (!r.canKing) return false;

    const target = board[r.toRow][r.toCol];
    if (target !== " " && target === target.toUpperCase()) return false;

    // Square must not be attacked by any black piece
    return !routes.some(
      (a) =>
        a.toRow === r.toRow &&
        a.toCol === r.toCol &&
        !a.isBlocked &&
        ((board[a.fromRow][a.fromCol] === "b" && a.canBishop) ||
          (board[a.fromRow][a.fromCol] === "r" && a.canRook) ||
          (board[a.fromRow][a.fromCol] === "q" && a.canQueen) ||
          (board[a.fromRow][a.fromCol] === "n" && a.canKnight) ||
          (board[a.fromRow][a.fromCol] === "k" && a.canKing) ||
          (board[a.fromRow][a.fromCol] === "p" && a.canBlackPawn)),
    );
  }).length;

  // 2. Is white currently being attacked and if so can he block or take the piece
  let whiteCanBlock = () => {
    const attacker = routes.find(
      (a) =>
        board[a.toRow][a.toCol] === "K" &&
        !a.isBlocked &&
        board[a.fromRow][a.fromCol] !== " " &&
        board[a.fromRow][a.fromCol] ===
          board[a.fromRow][a.fromCol].toLowerCase() && // black attacker
        ((board[a.fromRow][a.fromCol] === "b" && a.canBishop) ||
          (board[a.fromRow][a.fromCol] === "r" && a.canRook) ||
          (board[a.fromRow][a.fromCol] === "q" && a.canQueen) ||
          (board[a.fromRow][a.fromCol] === "n" && a.canKnight) ||
          (board[a.fromRow][a.fromCol] === "k" && a.canKing) ||
          (board[a.fromRow][a.fromCol] === "p" && a.canBlackPawn)),
    );

    if (!attacker) {
      return false;
    }

    return canBeBlockedOrTaken(
      attacker.fromRow,
      attacker.fromCol,
      attacker.toRow,
      attacker.toCol,
      "W",
    );
  };

  const blackKMoves = routes.filter((r) => {
    if (board[r.fromRow][r.fromCol] !== "k") return false;
    if (!r.canKing) return false;

    const target = board[r.toRow][r.toCol];
    if (target !== " " && target !== target.toUpperCase()) return false;

    // Square must not be attacked by any white piece
    return !routes.some(
      (a) =>
        a.toRow === r.toRow &&
        a.toCol === r.toCol &&
        !a.isBlocked &&
        ((board[a.fromRow][a.fromCol] === "B" && a.canBishop) ||
          (board[a.fromRow][a.fromCol] === "R" && a.canRook) ||
          (board[a.fromRow][a.fromCol] === "Q" && a.canQueen) ||
          (board[a.fromRow][a.fromCol] === "N" && a.canKnight) ||
          (board[a.fromRow][a.fromCol] === "K" && a.canKing)),
    );
  }).length;
  // 2. Can a friendly piece block the check?

  let blackCanBlock = () => {
    const attacker = routes.find(
      (a) =>
        board[a.toRow][a.toCol] === "k" &&
        !a.isBlocked &&
        board[a.fromRow][a.fromCol] !== " " &&
        board[a.fromRow][a.fromCol] ===
          board[a.fromRow][a.fromCol].toUpperCase() && // white attacker
        ((board[a.fromRow][a.fromCol] === "B" && a.canBishop) ||
          (board[a.fromRow][a.fromCol] === "R" && a.canRook) ||
          (board[a.fromRow][a.fromCol] === "Q" && a.canQueen) ||
          (board[a.fromRow][a.fromCol] === "N" && a.canKnight) ||
          (board[a.fromRow][a.fromCol] === "P" && a.canWhitePawn)),
    );

    //console.log(attacker);

    if (!attacker) return false;
    return canBeBlockedOrTaken(
      attacker.fromRow,
      attacker.fromCol,
      attacker.toRow,
      attacker.toCol,
      "B",
    );
  };

  debugger;
  let checkB = routes.filter((y) => y.check == 1).length;
  let checkW = routes.filter((y) => y.check == 2).length;

  if (checkW > 0 && whiteKMoves === 0 && !whiteCanBlock())
    alert("Checkmate! Black wins.");
  if (checkB > 0 && blackKMoves === 0 && !blackCanBlock())
    alert("Checkmate! White wins.");
}
// ─── Board Initialisation ─────────────────────────────────────────────────────

window.onload = function () {
  const gameboard = document.querySelector(".board");
  const numbers = document.querySelector(".numbers");
  const letters = document.querySelector(".letters");

  let lightSquare = true;
  for (let row = 0; row <= 7; row++) {
    for (let col = 0; col <= 7; col++) {
      const square = document.createElement("div");
      square.id = squareId(col, row);
      square.classList.add("square");
      square.textContent = PIECES[board[row][col]] ?? "";
      if (!lightSquare) square.classList.add("black");
      lightSquare = !lightSquare;
      if ((col + 1) % 8 === 0) lightSquare = !lightSquare;
      gameboard.appendChild(square);
    }
  }

  for (let i = 1; i <= 8; i++) {
    const li = document.createElement("li");
    li.textContent = i;
    numbers.appendChild(li);
  }

  for (let i = 0; i <= 7; i++) {
    const li = document.createElement("li");
    li.textContent = COLS[i];
    letters.appendChild(li);
  }

  // ── Click handler ──────────────────────────────────────────────────────────
  gameboard.addEventListener("click", function (event) {
    const target = event.target.closest(".square");
    if (!target) return;
    const fromId = selectedSquare;
    const isMoveDest = selectedSquare && target.classList.contains("move");

    if (isMoveDest) {
      const toId = target.id;
      const route = routes.find((r) => r.fromId === fromId && r.toId === toId);
      if (route) {
        if (
          route.fromRow == 1 &&
          route.toRow == 3 &&
          route.canBlackPawn &&
          board[route.fromRow][route.fromCol] == "p"
        ) {
          if (
            (route.fromCol > 0 &&
              route.fromCol < 7 &&
              (board[route.toRow][route.toCol + 1] == "P" ||
                board[route.toRow][route.toCol - 1] == "P")) ||
            (route.fromCol == 0 &&
              board[route.toRow][route.toCol + 1] == "P") ||
            (route.fromCol == 7 && board[route.toRow][route.toCol - 1] == "P")
          )
            enPassantMeBlack[route.toCol] = 1;
          // console.log(enPassantMeBlack);
        }

        if (
          route.fromRow == 6 &&
          route.toRow == 4 &&
          route.canWhitePawn &&
          board[route.fromRow][route.fromCol] == "P"
        ) {
          if (
            (route.fromCol > 0 &&
              route.fromCol < 7 &&
              (board[route.toRow][route.toCol + 1] == "p" ||
                board[route.toRow][route.toCol - 1] == "p")) ||
            (route.fromCol == 0 &&
              board[route.toRow][route.toCol + 1] == "p") ||
            (route.fromCol == 7 && board[route.toRow][route.toCol - 1] == "p")
          )
            enPassantMeWhite[route.toCol] = 1;
          // console.log(enPassantMeWhite);
        }
      }

      //console.table(routes);

      let letterFirst = "";
      let moove = "";

      if (board[route.fromRow][route.fromCol].toUpperCase() != "P") {
        letterFirst = board[route.fromRow][route.fromCol].toUpperCase();
      }

      moove = `${letterFirst}${toId.toLowerCase()}`;

      if (
        (moove == "Kg1" || moove == "Kg8") &&
        Math.abs(route.fromCol - route.toCol) == 2
      ) {
        moove = "O-O";
      }

      if (
        (moove == "Kc1" || moove == "Kc8") &&
        Math.abs(route.fromCol - route.toCol) == 2
      ) {
        moove = "O-O-O";
      }

      if (whiteToMove) {
        lastMove = moove;
      } else {
        lastMove = lastMove + "     " + moove;
      }

      boardPrev = structuredClone(board);

      board[route.toRow][route.toCol] = board[route.fromRow][route.fromCol];
      board[route.fromRow][route.fromCol] = " ";

      const eP = routes.find((z) => z.fromId == route.enPassantId);
      if (eP) {
        board[eP.fromRow][eP.fromCol] = " ";
      }
      routes.forEach((r) => (r.lastCheck = check));
      adjustRoutes();

      // ── Reject move if it leaves/puts own king in check ───────────────

      if (routes.filter((h) => h.check > 0 && h.lastCheck > 0).length > 0) {
        undoMove();
        alert("Illegal — you are in check!");
      } else {
        // Log move in sidebar

        if (whiteToMove) {
          history.push(lastMove);
          const moveLine = document.createElement("div");

          moveLine.id = "Move" + history.length;
          moveLine.classList.add("moveline");
          moveLine.textContent = (history.length + ". " + lastMove).trim();
          document.getElementById("display").appendChild(moveLine);
        } else {
          const moveLine = document.getElementById("Move" + history.length);
          moveLine.textContent = (history.length + ". " + lastMove).trim();
        }

        // Update DOM
        document.getElementById(toId).textContent =
          document.getElementById(fromId).textContent;
        document.getElementById(fromId).textContent = "";

        if (route.enPassantId !== null) {
          document.getElementById(route.enPassantId).textContent = " ";
        }

        if (fromId == "E1" && toId == "C1") {
          document.getElementById("D1").textContent =
            document.getElementById("A1").textContent;
          document.getElementById("A1").textContent = " ";

          board[7][2] = board[7][0];
          board[7][0] = " ";
        }
        if (fromId == "E1" && toId == "G1") {
          document.getElementById("F1").textContent =
            document.getElementById("H1").textContent;
          document.getElementById("H1").textContent = " ";
          board[7][5] = board[7][7];
          board[7][7] = " ";
        }

        if (fromId == "E8" && toId == "C8") {
          document.getElementById("D8").textContent =
            document.getElementById("A8").textContent;
          document.getElementById("A8").textContent = " ";

          board[0][2] = board[0][0];
          board[0][0] = " ";
        }

        if (fromId == "E8" && toId == "G8") {
          document.getElementById("F8").textContent =
            document.getElementById("H8").textContent;
          document.getElementById("H8").textContent = " ";

          board[0][5] = board[0][7];
          board[0][7] = " ";
        }

        checkForCheckmate();
        castlingCheck("m", whiteToMove, fromId);
      }
      document
        .querySelectorAll(".selected, .move")
        .forEach((sq) => sq.classList.remove("selected", "move"));
      whiteToMove = !whiteToMove;
    } else {
      // ── Select a piece ───────────────────────────────────────────────────

      document
        .querySelectorAll(".selected, .move")
        .forEach((sq) => sq.classList.remove("selected", "move"));

      target.classList.add("selected");
      selectedSquare = target.id;
      //castlingCheck(whiteToMove, selectedSquare);
      castlingCheck("s", whiteToMove, selectedSquare);
      adjustRoutes();
      highlightMoves(selectedSquare);
    }
  });
};
