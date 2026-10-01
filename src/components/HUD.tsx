// HUD uses direct DOM updates for performance — structure/data-hud attrs are the contract.
// Styling lives in ./hud.css (Neon Overdrive redesign).
function HUD() {
  return (
    <>
      {/* Game title */}
      <div className="game-title">
        NEON <span>//</span> OVERDRIVE
      </div>

      {/* Speed Display - Left Corner */}
      <div className="hud-panel speed-panel">
        <div className="hud-label">Velocity</div>
        <div data-hud="speed-value" className="hud-value">
          0%
        </div>
        <div className="hud-bar">
          <div data-hud="speed-bar" className="hud-bar-fill" />
        </div>
      </div>

      {/* Missile Counter - Left Corner Below Speed */}
      <div className="hud-panel missiles-panel">
        <div className="hud-label">Missiles</div>
        <div data-hud="missiles-value" className="hud-value" style={{ color: '#5a5470', textShadow: 'none' }}>
          🚀 0
        </div>
        <div className="hud-sub">Find rocket launcher</div>
      </div>

      {/* Boost Display - Top Center - Only shown when boosted (JS toggles display) */}
      <div data-hud="boost-container" className="hud-panel boost-panel" style={{ display: 'none' }}>
        <div className="hud-label">Boost</div>
        <div data-hud="boost-value" className="hud-value">
          0s
        </div>
        <div className="hud-bar">
          <div data-hud="boost-bar" className="hud-bar-fill" />
        </div>
        <div className="powerup-status">⚡ Active ⚡</div>
      </div>

      {/* Triple Rocket Display - Only shown when active */}
      <div data-hud="triple-container" className="hud-panel triple-panel" style={{ display: 'none' }}>
        <div className="hud-label">Triple Rockets</div>
        <div data-hud="triple-value" className="hud-value">
          🚀🚀🚀 0s
        </div>
        <div className="hud-bar">
          <div data-hud="triple-bar" className="hud-bar-fill" />
        </div>
        <div className="powerup-status">⚡ 3X Mode ⚡</div>
      </div>

      {/* Spread Shot Display - Only shown when active */}
      <div data-hud="spread-container" className="hud-panel spread-panel" style={{ display: 'none' }}>
        <div className="hud-label">Spread Shot</div>
        <div data-hud="spread-value" className="hud-value">
          0s
        </div>
        <div className="hud-bar">
          <div data-hud="spread-bar" className="hud-bar-fill" />
        </div>
        <div className="powerup-status">✦ 8-Shot ✦</div>
      </div>

      {/* Score Display - Right Corner */}
      <div className="hud-panel score-panel">
        <div className="hud-label">Score</div>
        <div data-hud="score-value" className="hud-value">
          0
        </div>
      </div>
    </>
  )
}

export default HUD
