import { forecastScale, roundedForecast } from "./forecastLevels";

const scaleFor = values => forecastScale(values.map(predicted => ({ predicted })));

test("three count intervals match displayed values and include both endpoints", () => {
  const scale = scaleFor([100, 102, 103, 105, 106, 108]);
  expect(scale.bands.map(({ min, max }) => [min, max])).toEqual([[100, 102], [103, 105], [106, 108]]);
  expect([100, 102, 103, 105, 106, 108].map(value => scale.levelFor(value).key)).toEqual(["low", "low", "medium", "medium", "high", "high"]);
  expect(scale.levelFor(99)).toBeNull();
});

test("small spreads omit empty intervals instead of displaying contradictory ranges", () => {
  const scale = scaleFor([12.6, 14.4]);
  expect(scale.bands.map(({ min, max }) => [min, max])).toEqual([[13, 13], [14, 14]]);
  expect(scale.levelFor(12.6).key).toBe("low");
  expect(scale.levelFor(14.4).key).toBe("high");
});

test("equal rounded forecasts are uniform rather than arbitrary high or low months", () => {
  const scale = scaleFor([100.1, 100.4]);
  expect(scale.mode).toBe("even");
  expect(scale.levelFor(100.1).label).toBe("Đồng đều");
  expect(scale.levelFor(100.4).label).toBe("Đồng đều");
});

test("one month is explicitly not compared against itself", () => {
  const scale = scaleFor([55]);
  expect(scale.mode).toBe("single");
  expect(scale.levelFor(55).label).toBe("—");
});

test("zero is a valid forecast while invalid or missing counts cannot receive a level", () => {
  const scale = scaleFor([0, 4, NaN, Infinity, -1, null]);
  expect(scale.levelFor(0).key).toBe("low");
  expect(scale.levelFor(4).key).toBe("high");
  [NaN, Infinity, -1, null, undefined, "4"].forEach(value => {
    expect(roundedForecast(value)).toBeNull();
    expect(scale.levelFor(value)).toBeNull();
  });
  expect(scaleFor([]).mode).toBe("empty");
  expect(scaleFor([null, NaN]).bands).toEqual([]);
});
