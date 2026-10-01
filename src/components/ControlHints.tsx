// Control hints — styled via ./hud.css (Neon Overdrive redesign)
function ControlHints() {
  return (
    <div className="control-hints">
      <div className="hints-title">Controls</div>

      <div className="hint-row" style={{ ['--chip' as any]: '#ffe14d' }}>
        <span className="key-chip">WASD</span>
        <span className="hint-label">Movement</span>
      </div>

      <div className="hint-row" style={{ ['--chip' as any]: '#ff2bd6' }}>
        <span className="key-chip">SPACE</span>
        <span className="hint-label">Plasma Gun</span>
      </div>

      <div className="hint-row" style={{ ['--chip' as any]: '#ff7a1a' }}>
        <span className="key-chip">M</span>
        <span className="hint-label">Rockets</span>
      </div>

      <div className="hint-row" style={{ ['--chip' as any]: '#39ff6a' }}>
        <span className="key-chip">R</span>
        <span className="hint-label">Sound</span>
      </div>

      <div className="hint-row" style={{ ['--chip' as any]: '#00f0ff' }}>
        <span className="key-chip">T</span>
        <span className="hint-label">Wet Road</span>
      </div>
    </div>
  )
}

export default ControlHints
