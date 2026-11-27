export const roundedForecast = value => typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;

// Levels compare the displayed visit counts within this forecast period.
export function forecastScale(points) {
  const values = points.map(row => roundedForecast(row.predicted)).filter(value => value !== null);
  if (!values.length) return { bands: [], levelFor: () => null, mode: "empty" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (values.length === 1 || min === max) {
    const band = { key: "even", label: values.length === 1 ? "—" : "Đồng đều", min, max };
    return { bands: [band], levelFor: value => roundedForecast(value) === null ? null : band, mode: values.length === 1 ? "single" : "even" };
  }
  const first = min + Math.floor((max - min) / 3);
  const second = min + Math.floor(2 * (max - min) / 3);
  const bands = [
    { key: "low", label: "Ít", min, max: first },
    { key: "medium", label: "Vừa", min: first + 1, max: second },
    { key: "high", label: "Nhiều", min: second + 1, max },
  ].filter(band => band.min <= band.max);
  return { bands, mode: "range", levelFor: value => {
    const rounded = roundedForecast(value);
    return rounded === null ? null : bands.find(band => rounded >= band.min && rounded <= band.max) || null;
  } };
}
