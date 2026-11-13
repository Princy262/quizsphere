// Shows what each button color means in the question grid.
// The swatches are empty on purpose, so they are not mistaken for question numbers.
const PaletteLegend = () => (
  <div className="legend">
    <div className="legend-item">
      <span className="swatch green" /> Answered
    </div>
    <div className="legend-item">
      <span className="swatch yellow" /> Marked for review
    </div>
    <div className="legend-item">
      <span className="swatch" /> Not answered yet
    </div>
    <div className="legend-item">
      <span className="swatch current" /> The question you are on
    </div>
  </div>
);

export default PaletteLegend;