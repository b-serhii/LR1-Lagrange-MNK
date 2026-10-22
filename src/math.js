
export function checkPoints(points, expectedCount = null) {
  if (!Array.isArray(points) || points.length < 2) throw new Error('Потрібно щонайменше дві точки.');
  if (expectedCount !== null && points.length !== expectedCount) {
    throw new Error(`Потрібно рівно ${expectedCount} точок, отримано ${points.length}.`);
  }
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Координати мають бути скінченними числами.');
  }
  const xs = new Set(points.map(p => p.x));
  if (xs.size !== points.length) throw new Error('Координати x повинні бути різними.');
  return points.slice().sort((a, b) => a.x - b.x);
}

export function barycentricWeights(points) {
  const n = points.length;
  const signs = Array(n).fill(1), logs = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const diff = points[i].x - points[j].x;
      if (diff === 0) throw new Error('Повторювані x недопустимі.');
      if (diff < 0) signs[i] = -signs[i];
      logs[i] -= Math.log(Math.abs(diff));
    }
  }
  const maxLog = Math.max(...logs);
  return logs.map((v, i) => signs[i] * Math.exp(v - maxLog));
}

export function createLagrange(inputPoints) {
  const points = checkPoints(inputPoints);
  const weights = barycentricWeights(points);
  const range = Math.max(1, points[points.length - 1].x - points[0].x);
  return (x) => {
    // Повернення точного вузлового значення усуває похибку 0/0.
    for (const p of points) if (Math.abs(p.x - x) <= 1e-13 * range) return p.y;
    let numerator = 0, denominator = 0;
    for (let i = 0; i < points.length; i++) {
      const term = weights[i] / (x - points[i].x);
      numerator += term * points[i].y;
      denominator += term;
    }
    const y = numerator / denominator;
    return Number.isFinite(y) ? y : NaN;
  };
}

export function solveLeastSquaresQR(matrix, values) {
  const rows = matrix.length, cols = matrix[0].length;
  if (rows < cols || values.length !== rows) throw new Error('Несумісна розмірність дизайн-матриці.');
  const A = matrix.map(row => row.slice());
  const b = values.slice();
  for (let k = 0; k < cols; k++) {
    let norm = 0;
    for (let i = k; i < rows; i++) norm = Math.hypot(norm, A[i][k]);
    if (norm < 1e-13) throw new Error('Матриця вироджена — зменште ступінь полінома.');
    const sign = A[k][k] >= 0 ? 1 : -1;
    const v = Array(rows - k);
    v[0] = A[k][k] + sign * norm;
    for (let i = k + 1; i < rows; i++) v[i - k] = A[i][k];
    let vv = 0;
    for (const vi of v) vv += vi * vi;
    if (!vv) throw new Error('Некоректне QR-розкладання.');
    const factor = 2 / vv;
    for (let j = k; j < cols; j++) {
      let dot = 0;
      for (let i = k; i < rows; i++) dot += v[i - k] * A[i][j];
      dot *= factor;
      for (let i = k; i < rows; i++) A[i][j] -= dot * v[i - k];
    }
    let dotb = 0;
    for (let i = k; i < rows; i++) dotb += v[i - k] * b[i];
    dotb *= factor;
    for (let i = k; i < rows; i++) b[i] -= dotb * v[i - k];
  }
  const solution = Array(cols).fill(0);
  for (let i = cols - 1; i >= 0; i--) {
    let v = b[i];
    for (let j = i + 1; j < cols; j++) v -= A[i][j] * solution[j];
    if (Math.abs(A[i][i]) < 1e-13) throw new Error('Неможливо розв’язати систему.');
    solution[i] = v / A[i][i];
  }
  return solution;
}

export function fitLeastSquares(inputPoints, degree = 2) {
  const points = checkPoints(inputPoints);
  if (!Number.isInteger(degree) || degree < 1 || degree >= points.length) {
    throw new Error('Ступінь МНК має бути від 1 до n−1.');
  }
  const center = (points[0].x + points[points.length - 1].x) / 2;
  const scale = (points[points.length - 1].x - points[0].x) / 2;
  const matrix = points.map(p => {
    const t = (p.x - center) / scale;
    const row = [1];
    for (let k = 1; k <= degree; k++) row.push(row[k - 1] * t);
    return row;
  });
  const coefficients = solveLeastSquaresQR(matrix, points.map(p => p.y));
  const predict = x => {
    const t = (x - center) / scale;
    let result = 0;
    for (let i = coefficients.length - 1; i >= 0; i--) result = result * t + coefficients[i];
    return result;
  };
  return { degree, coefficients, center, scale, predict, matrix };
}

export function getMetrics(points, predict) {
  const errors = points.map(p => p.y - predict(p.x));
  const sse = errors.reduce((sum, e) => sum + e * e, 0);
  const rmse = Math.sqrt(sse / points.length);
  const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / points.length;
  const maxError = Math.max(...errors.map(Math.abs));
  const average = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const sst = points.reduce((sum, p) => sum + (p.y - average) ** 2, 0);
  return { sse, rmse, mae, maxError, r2: sst > 1e-15 ? 1 - sse / sst : (sse < 1e-15 ? 1 : 0), errors };
}

export function buildSample(points, predict, steps = 280) {
  const minX = points[0].x, maxX = points[points.length - 1].x;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = minX + (maxX - minX) * i / steps;
    return { x, y: predict(x) };
  });
}

export function parsePoints(text, size) {
  const lines = text.trim().split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const parsed = lines.map((line, idx) => {
    const parts = line.split(/[;\s,]+/).filter(Boolean);
    if (parts.length !== 2) throw new Error(`Рядок ${idx + 1}: введіть два числа через кому або пробіл.`);
    const x = Number(parts[0]), y = Number(parts[1]);
    return { x, y, origin: 'custom' };
  });
  return checkPoints(parsed, size);
}
