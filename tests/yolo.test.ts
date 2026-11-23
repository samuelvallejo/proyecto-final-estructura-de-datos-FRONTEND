import test from 'node:test';
import assert from 'node:assert/strict';
import { decode, fitInput, hazardFromArea, iou, letterbox, stretch, toTensor, track } from '../src/services/yolo.ts';

/** Salida falsa de YOLOv8 [1, 5, anclas] con cajas en píxeles del cuadrado de entrada. */
function output(boxes: [number, number, number, number, number][], anchors = 8) {
  const data = new Float32Array(5 * anchors);
  boxes.forEach(([cx, cy, w, h, score], i) => {
    data[i] = cx; data[anchors + i] = cy; data[2 * anchors + i] = w; data[3 * anchors + i] = h; data[4 * anchors + i] = score;
  });
  return { data, dims: [1, 5, anchors] };
}

test('letterbox centra una imagen horizontal sin deformarla', () => {
  const box = letterbox(576, 320, 416);
  assert.ok(Math.abs(box.scaleX - 416 / 576) < 1e-9 && box.scaleX === box.scaleY);
  assert.equal(box.padX, 0);
  assert.equal(box.padY, Math.floor((416 - Math.round(320 * box.scaleY)) / 2));
});

test('el tensor queda en formato CHW normalizado', () => {
  const rgba = new Uint8ClampedArray([255, 0, 51, 255, 0, 255, 102, 255, 0, 0, 0, 255, 255, 255, 255, 255]);
  const tensor = toTensor(rgba, 2);
  assert.equal(tensor.length, 12);
  assert.deepEqual([...tensor.slice(0, 4)].map(v => +v.toFixed(2)), [1, 0, 0, 1]);
  assert.deepEqual([...tensor.slice(4, 8)].map(v => +v.toFixed(2)), [0, 1, 0, 1]);
  assert.deepEqual([...tensor.slice(8, 12)].map(v => +v.toFixed(2)), [.2, .4, 0, 1]);
});

test('decodifica, aplica umbral y suprime cajas superpuestas', () => {
  const box = letterbox(416, 416, 416);
  const { data, dims } = output([[208, 208, 104, 104, .9], [210, 210, 100, 100, .7], [50, 50, 20, 20, .5], [300, 300, 40, 40, .1]]);
  const boxes = decode(data, dims, box, .25);
  assert.equal(boxes.length, 2);
  assert.equal(boxes[0].score.toFixed(1), '0.9');
  assert.ok(Math.abs(boxes[0].x1 - .375) < 1e-6 && Math.abs(boxes[0].x2 - .625) < 1e-6);
  assert.ok(boxes.every(item => item.x1 >= 0 && item.x2 <= 1 && item.y1 >= 0 && item.y2 <= 1));
});

test('las coordenadas regresan a la imagen original quitando el borde gris', () => {
  const box = letterbox(800, 400, 416); // escala 0,52 y 104 px de borde arriba y abajo.
  const { data, dims } = output([[208, 208, 52, 52, .8]]);
  const [result] = decode(data, dims, box, .25);
  assert.ok(Math.abs((result.x1 + result.x2) / 2 - .5) < 1e-6);
  assert.ok(Math.abs((result.y1 + result.y2) / 2 - .5) < 1e-6);
  assert.ok(Math.abs((result.x2 - result.x1) - 52 / box.scaleX / 800) < 1e-6);
});

test('el modo estirado usa escalas distintas por eje y sin bordes', () => {
  const box = stretch(800, 400, 416);
  assert.deepEqual([box.padX, box.padY], [0, 0]);
  assert.ok(Math.abs(box.scaleX - .52) < 1e-9 && Math.abs(box.scaleY - 1.04) < 1e-9);
  const { data, dims } = output([[104, 208, 52, 104, .7]]);
  const [result] = decode(data, dims, box, .25);
  assert.ok(Math.abs(result.x1 - .1875) < 1e-6 && Math.abs(result.x2 - .3125) < 1e-6);
  assert.ok(Math.abs(result.y1 - .375) < 1e-6 && Math.abs(result.y2 - .625) < 1e-6);
  assert.equal(fitInput(800, 400, 416, 'letterbox').padY, letterbox(800, 400, 416).padY);
});

test('salidas inválidas no rompen el escaneo', () => {
  assert.deepEqual(decode(new Float32Array(3), [1, 3, 1], letterbox(10, 10, 416)), []);
});

test('el seguimiento conserva el identificador y suaviza el movimiento', () => {
  let id = 0;
  const first = track([], [{ x1: .1, y1: .1, x2: .3, y2: .3, score: .8 }], () => ++id);
  const second = track(first, [{ x1: .12, y1: .12, x2: .32, y2: .32, score: .85 }, { x1: .7, y1: .7, x2: .8, y2: .8, score: .6 }], () => ++id);
  assert.equal(second[0].id, 1);
  assert.equal(second[0].hits, 2);
  assert.ok(Math.abs(second[0].x1 - .11) < 1e-9);
  assert.equal(second[1].id, 2);
  assert.equal(second[1].hits, 1);
  assert.ok(iou(first[0], second[0]) > .8);
});

test('riesgo por tamaño del recuadro igual que el servidor', () => {
  assert.equal(hazardFromArea({ x1: 0, y1: 0, x2: .7, y2: .7, score: 1 }).level, 'CRITICAL');
  assert.equal(hazardFromArea({ x1: 0, y1: 0, x2: .45, y2: .45, score: 1 }).level, 'HIGH');
  assert.equal(hazardFromArea({ x1: 0, y1: 0, x2: .3, y2: .3, score: 1 }).level, 'MEDIUM');
  assert.equal(hazardFromArea({ x1: 0, y1: 0, x2: .1, y2: .1, score: 1 }).score, 35);
});
