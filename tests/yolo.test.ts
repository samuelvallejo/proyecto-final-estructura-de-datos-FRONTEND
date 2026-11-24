import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxTracker, YoloCodec } from '../src/services/yolo.ts';

/** Fake YOLOv8 output [1, 5, anchors] with boxes in pixels of the input square. */
function output(boxes: [number, number, number, number, number][], anchors = 8) {
  const data = new Float32Array(5 * anchors);
  boxes.forEach(([cx, cy, w, h, score], i) => {
    data[i] = cx; data[anchors + i] = cy; data[2 * anchors + i] = w; data[3 * anchors + i] = h; data[4 * anchors + i] = score;
  });
  return { data, dims: [1, 5, anchors] };
}

test('letterbox centers a landscape image without distorting it', () => {
  const box = YoloCodec.letterbox(576, 320, 416);
  assert.ok(Math.abs(box.scaleX - 416 / 576) < 1e-9 && box.scaleX === box.scaleY);
  assert.equal(box.padX, 0);
  assert.equal(box.padY, Math.floor((416 - Math.round(320 * box.scaleY)) / 2));
});

test('the tensor ends up in normalized CHW format', () => {
  const rgba = new Uint8ClampedArray([255, 0, 51, 255, 0, 255, 102, 255, 0, 0, 0, 255, 255, 255, 255, 255]);
  const tensor = YoloCodec.toTensor(rgba, 2);
  assert.equal(tensor.length, 12);
  assert.deepEqual([...tensor.slice(0, 4)].map(v => +v.toFixed(2)), [1, 0, 0, 1]);
  assert.deepEqual([...tensor.slice(4, 8)].map(v => +v.toFixed(2)), [0, 1, 0, 1]);
  assert.deepEqual([...tensor.slice(8, 12)].map(v => +v.toFixed(2)), [.2, .4, 0, 1]);
});

test('decodes, applies the threshold and suppresses overlapping boxes', () => {
  const box = YoloCodec.letterbox(416, 416, 416);
  const { data, dims } = output([[208, 208, 104, 104, .9], [210, 210, 100, 100, .7], [50, 50, 20, 20, .5], [300, 300, 40, 40, .1]]);
  const boxes = YoloCodec.decode(data, dims, box, .25);
  assert.equal(boxes.length, 2);
  assert.equal(boxes[0].score.toFixed(1), '0.9');
  assert.ok(Math.abs(boxes[0].x1 - .375) < 1e-6 && Math.abs(boxes[0].x2 - .625) < 1e-6);
  assert.ok(boxes.every(item => item.x1 >= 0 && item.x2 <= 1 && item.y1 >= 0 && item.y2 <= 1));
});

test('coordinates return to the original image without the grey border', () => {
  const box = YoloCodec.letterbox(800, 400, 416); // scale 0.52 and a 104 px border above and below.
  const { data, dims } = output([[208, 208, 52, 52, .8]]);
  const [result] = YoloCodec.decode(data, dims, box, .25);
  assert.ok(Math.abs((result.x1 + result.x2) / 2 - .5) < 1e-6);
  assert.ok(Math.abs((result.y1 + result.y2) / 2 - .5) < 1e-6);
  assert.ok(Math.abs((result.x2 - result.x1) - 52 / box.scaleX / 800) < 1e-6);
});

test('stretch mode uses a different scale per axis and no borders', () => {
  const box = YoloCodec.stretch(800, 400, 416);
  assert.deepEqual([box.padX, box.padY], [0, 0]);
  assert.ok(Math.abs(box.scaleX - .52) < 1e-9 && Math.abs(box.scaleY - 1.04) < 1e-9);
  const { data, dims } = output([[104, 208, 52, 104, .7]]);
  const [result] = YoloCodec.decode(data, dims, box, .25);
  assert.ok(Math.abs(result.x1 - .1875) < 1e-6 && Math.abs(result.x2 - .3125) < 1e-6);
  assert.ok(Math.abs(result.y1 - .375) < 1e-6 && Math.abs(result.y2 - .625) < 1e-6);
  assert.equal(YoloCodec.fitInput(800, 400, 416, 'letterbox').padY, YoloCodec.letterbox(800, 400, 416).padY);
});

test('invalid outputs do not break scanning', () => {
  assert.deepEqual(YoloCodec.decode(new Float32Array(3), [1, 3, 1], YoloCodec.letterbox(10, 10, 416)), []);
});

test('tracking keeps the identifier and smooths the motion', () => {
  let id = 0;
  const first = BoxTracker.track([], [{ x1: .1, y1: .1, x2: .3, y2: .3, score: .8 }], () => ++id);
  const second = BoxTracker.track(first, [{ x1: .12, y1: .12, x2: .32, y2: .32, score: .85 }, { x1: .7, y1: .7, x2: .8, y2: .8, score: .6 }], () => ++id);
  assert.equal(second[0].id, 1);
  assert.equal(second[0].hits, 2);
  assert.ok(Math.abs(second[0].x1 - .11) < 1e-9);
  assert.equal(second[1].id, 2);
  assert.equal(second[1].hits, 1);
  assert.ok(YoloCodec.iou(first[0], second[0]) > .8);
});

test('risk from box size matches the server', () => {
  assert.equal(YoloCodec.hazardFromArea({ x1: 0, y1: 0, x2: .7, y2: .7, score: 1 }).level, 'CRITICAL');
  assert.equal(YoloCodec.hazardFromArea({ x1: 0, y1: 0, x2: .45, y2: .45, score: 1 }).level, 'HIGH');
  assert.equal(YoloCodec.hazardFromArea({ x1: 0, y1: 0, x2: .3, y2: .3, score: 1 }).level, 'MEDIUM');
  assert.equal(YoloCodec.hazardFromArea({ x1: 0, y1: 0, x2: .1, y2: .1, score: 1 }).score, 35);
});
