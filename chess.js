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
let wCanCastleKQ = [1, 1];
let bCanCastleKQ = [1, 1];

let enPassantMeWhite = [0, 0, 0, 0, 0, 0, 0, 0];
let enPassantMeBlack = [0, 0, 0, 0, 0, 0, 0, 0];
let check = 0;
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
  underCheck,
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
    underCheck,
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
  board = structuredClone(boardPrev);
  renderBoard();
  adjustRoutes();
  whiteToMove = !whiteToMove;
  const parent = document.getElementById("display");
  parent.lastElementChild.remove();
  history.pop();
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
      if (blockerWhite > 0) {
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

function adjustRoutes() {
  routes = [];
  check = 0;

  document
    .querySelectorAll(".check")
    .forEach((el) => el.classList.remove("check"));

  for (let r = 0; r <= 7; r++) {
    for (let c = 0; c <= 7; c++) {
      for (let s = 0; s <= 7; s++) {
        for (let d = 0; d <= 7; d++) {
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
            isBlocked = "N";
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
            isBlocked = "N";
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
            isBlocked = "N";
          }
          debugger;
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
            isBlocked = "N";
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
              underCheck: check,
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

    const piece = board[route.fromRow][route.fromCol];
    const isWhitePiece = piece === piece.toUpperCase();
    const targetPiece = board[route.toRow][route.toCol];

    if (whiteToMove && isWhitePiece) {
      const targetIsEmpty = targetPiece === " ";
      const targetIsBlack =
        targetPiece !== " " && targetPiece === targetPiece.toLowerCase();
      if (targetIsEmpty || targetIsBlack) {
        document.getElementById(route.toId).classList.add("move");
      }
    }
    if (!whiteToMove && !isWhitePiece) {
      const targetIsEmpty = targetPiece === " ";
      const targetIsWhite =
        targetPiece !== " " && targetPiece === targetPiece.toUpperCase();
      if (targetIsEmpty || targetIsWhite) {
        document.getElementById(route.toId).classList.add("move");
      }
    }
  }
}

function castlingCheck(wm, from, to) {
  if (wm == true) {
    if (from == "A1") {
      WQRhasMoved = 1;
      wCanCastleKQ[1] = 0;
    }

    if (from == "E1") {
      WKhasMoved = 1;
      wCanCastleKQ[0] = 0;
      wCanCastleKQ[1] = 0;
    }
    if (from == "H1") {
      WKRhasMoved = 1;
      wCanCastleKQ[0] = 0;
    }

    if (board[7][1] == " " && board[7][2] == " " && board[7][3] == " ") {
      WQSideBlocked = 0;
    }

    if (board[7][5] == " " && board[7][6] == " ") {
      WKSideBlocked = 0;
    }

    WQSideChecked = routes.filter((w) => {
      w.s == 7 && w.d >= 2 && w.d <= 4 && w.isBlocked != "Y";
    }).length;
    WKSideChecked = routes.filter((x) => {
      x.s == 7 && w.d >= 4 && x.d <= 6 && x.isBlocked != "Y";
    }).length;

    // if (WQSideChecked > 0) {
    //   wCanCastleKQ[1] = 0;
    // }
    // if (WKSideChecked > 0) {
    //   wCanCastleKQ[0] = 0;
    // }
  } else {
    if (from == "A8") {
      BQRhasMoved = 1;
      bCanCastleKQ[1] = 0;
    }
    if (from == "E8") {
      BKhasMoved = 1;
      bCanCastleKQ[0] = 0;
      bCanCastleKQ[1] = 0;
    }
    if (from == "H8") {
      BKRhasMoved = 1;
      bCanCastleKQ[0] = 0;
    }

    if (board[0][1] == " " && board[0][2] == " " && board[0][3] == " ") {
      BQSideBlocked = 0;
    }

    if (board[0][5] == " " && board[0][6] == " ") {
      BKSideBlocked = 0;
    }

    BQSideChecked = routes.filter((b) => {
      b.s == 0 && b.d >= 2 && b.d <= 4 && b.isBlocked != "Y";
    }).length;
    BKSideChecked = routes.filter((c) => {
      c.s == 0 && c.d >= 4 && c.d <= 6 && c.isBlocked != "Y";
    }).length;

    // if (BQSideChecked > 0 && bCanCastleKQ[1] = 0;
    //   bCanCastleKQ[1] = 0;
    // }
    // if (BKSideChecked > 0) {
    //   bCanCastleKQ[0] = 0;
    // }
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
    if (target !== " " && target !== target.toLowerCase()) return false;

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
          (board[a.fromRow][a.fromCol] === "q" && a.canQueen),
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

  // Both now consistent

  if (check === 2 && whiteKMoves === 0 && !whiteCanBlock())
    alert("Checkmate! Black wins.");
  if (check === 1 && blackKMoves === 0 && !blackCanBlock())
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

    const isMoveDest = selectedSquare && target.classList.contains("move");

    if (isMoveDest) {
      const fromId = selectedSquare;
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
      if (whiteToMove) {
        lastMove = "";
      }
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

      lastMove = lastMove + "      " + moove;

      boardPrev = structuredClone(board);

      board[route.toRow][route.toCol] = board[route.fromRow][route.fromCol];
      board[route.fromRow][route.fromCol] = " ";

      const eP = routes.find((z) => (z.fromId = route.enPassantId));
      if (eP) {
        board[eP.fromRow][eP.fromCol] = " ";
      }
      lastCheck = check;
      adjustRoutes();

      castlingCheck(whiteToMove, fromId, toId);

      // ── Reject move if it leaves/puts own king in check ───────────────
      if (
        (check !== 0 && lastCheck === check) ||
        (lastCheck === 0 && check === 1 && !whiteToMove) ||
        (lastCheck === 0 && check === 2 && whiteToMove)
      ) {
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
      }
      document
        .querySelectorAll(".selected, .move")
        .forEach((sq) => sq.classList.remove("selected", "move"));
      whiteToMove = !whiteToMove;
    } else {
      // ── Select a piece ───────────────────────────────────────────────────
      adjustRoutes();
      document
        .querySelectorAll(".selected, .move")
        .forEach((sq) => sq.classList.remove("selected", "move"));
      selectedSquare = target.id;
      target.classList.add("selected");
      highlightMoves(selectedSquare);
    }
  });
};
