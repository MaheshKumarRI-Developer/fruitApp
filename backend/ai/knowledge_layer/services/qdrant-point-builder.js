function buildPoint(
  id,
  vector,
  fruit
) {
  return {
    id,
    vector,
    payload: fruit
  };
}

module.exports = {
  buildPoint
};
