import { test } from "node:test";
import assert from "node:assert/strict";
import { addCards, answerCard, dueCards, boxCounts, dayNumber } from "../src/srs.js";

test("new cards are due today", () => {
  const srs = {};
  assert.equal(addCards(srs, ["a", "b", "a"], 100), 2);
  assert.deepEqual(dueCards(srs, 100), ["a", "b"]);
  assert.equal(addCards(srs, ["a"], 101), 0);
});

test("right answers climb the boxes with growing intervals", () => {
  const srs = {};
  addCards(srs, ["w"], 0);
  const dues = [];
  let day = 0;
  for (let i = 0; i < 5; i++) {
    const c = answerCard(srs, "w", true, day);
    dues.push(c.due - day);
    day = c.due;
  }
  assert.deepEqual(dues, [2, 4, 8, 16, 16]);
  assert.equal(srs.w.box, 5);
});

test("a wrong answer sends the card back to box 1, due tomorrow", () => {
  const srs = {};
  addCards(srs, ["w"], 0);
  answerCard(srs, "w", true, 0);
  answerCard(srs, "w", true, 2);
  const c = answerCard(srs, "w", false, 6);
  assert.equal(c.box, 1);
  assert.equal(c.due, 7);
  assert.deepEqual(dueCards(srs, 6), []);
  assert.deepEqual(dueCards(srs, 7), ["w"]);
});

test("due cards: most overdue first, limited", () => {
  const srs = { a: { box: 3, due: 5 }, b: { box: 1, due: 2 }, c: { box: 2, due: 2 }, d: { box: 1, due: 9 } };
  assert.deepEqual(dueCards(srs, 6), ["b", "c", "a"]);
  assert.deepEqual(dueCards(srs, 6, 2), ["b", "c"]);
  assert.deepEqual(boxCounts(srs), [0, 2, 1, 1, 0, 0]);
});

test("dayNumber counts calendar days", () => {
  assert.equal(dayNumber(new Date(2026, 9, 3)) - dayNumber(new Date(2026, 9, 2)), 1);
});
