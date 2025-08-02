// HUD now uses direct DOM updates for performance - initial values only
function HUD() {

  return (
    <>
      {/* Speed Display - Left Corner */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#00ffff',
        textShadow: '0 0 10px #00ffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '2px solid #ff00ff',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 0 20px rgba(255, 0, 255, 0.5)',
        minWidth: '180px'
      }}>
        <div style={{ 
          color: '#ff6600', 
          fontSize: '12px', 
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          SPEED
        </div>
        <div data-hud="speed-value" style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#00ffff'
        }}>
          0%
        </div>
        {/* Speed Bar */}
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: 'rgba(0, 255, 255, 0.2)',
          border: '1px solid #00ffff',
          marginTop: '4px',
          position: 'relative'
        }}>
          <div data-hud="speed-bar" style={{
            width: '0%',
            height: '100%',
            backgroundColor: '#00ffff',
            boxShadow: '0 0 10px #00ffff',
            transition: 'all 0.2s ease'
          }} />
        </div>
      </div>

      {/* Missile Counter - Left Corner Below Speed */}
      <div style={{
        position: 'fixed',
        top: '120px',
        left: '20px',
        zIndex: 1000,
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#666666',
        textShadow: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '2px solid #666666',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: 'none',
        minWidth: '180px'
      }}>
        <div style={{ 
          color: '#ff6600', 
          fontSize: '12px', 
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          MISSILES
        </div>
        <div data-hud="missiles-value" style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#666666',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🚀 0
        </div>
        <div style={{
          fontSize: '10px',
          color: '#666666',
          marginTop: '4px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Find Rocket Launcher
        </div>
      </div>

      {/* Boost Display - Center Top - Only show when boosted */}
      <div data-hud="boost-container" style={{
          display: 'none',
        position: 'fixed',
        top: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        fontFamily: 'monospace',
        fontSize: '18px',
        textAlign: 'center',
        color: '#00ff00',
        textShadow: '0 0 15px #00ff00',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid #00ff00',
        borderRadius: '12px',
        padding: '12px 20px',
        boxShadow: '0 0 25px rgba(0, 255, 0, 0.6)',
        minWidth: '140px'
      }}>
          <div style={{ 
            color: '#ff6600', 
            fontSize: '11px', 
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            opacity: 0.8
          }}>
            BOOST
          </div>
          
          <div data-hud="boost-value" style={{ 
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#00ff00',
            marginBottom: '6px',
            textShadow: '0 0 20px #00ff00'
          }}>
            0s
          </div>
          
          {/* Boost Bar */}
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid #00ff00',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div data-hud="boost-bar" style={{
              width: '0%',
              height: '100%',
              backgroundColor: '#00ff00',
              boxShadow: '0 0 15px #00ff00',
              transition: 'all 0.1s ease',
              borderRadius: '3px'
            }} />
          </div>

          {/* Boost Status Animation */}
          <div style={{
            marginTop: '6px',
            fontSize: '10px',
            color: '#00ff00',
            textAlign: 'center',
            animation: 'pulse 0.8s infinite',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            textShadow: '0 0 10px #00ff00'
          }}>
            ⚡ ACTIVE ⚡
          </div>
        </div>

      {/* Spread Shot Display - Center Top Right - Only show when active */}
      <div data-hud="spread-container" style={{
          display: 'none',
        position: 'fixed',
        top: '30px',
        right: '30%',
        zIndex: 1000,
        fontFamily: 'monospace',
        fontSize: '18px',
        textAlign: 'center',
        color: '#ffff00',
        textShadow: '0 0 15px #ffff00',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid #ffff00',
        borderRadius: '12px',
        padding: '12px 20px',
        boxShadow: '0 0 25px rgba(255, 255, 0, 0.6)',
        minWidth: '140px'
      }}>
          <div style={{ 
            color: '#ff6600', 
            fontSize: '11px', 
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            opacity: 0.8
          }}>
            SPREAD SHOT
          </div>
          
          <div data-hud="spread-value" style={{ 
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#ffff00',
            marginBottom: '6px',
            textShadow: '0 0 20px #ffff00'
          }}>
            0s
          </div>
          
          {/* Spread Shot Bar */}
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid #ffff00',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div data-hud="spread-bar" style={{
              width: '0%',
              height: '100%',
              backgroundColor: '#ffff00',
              boxShadow: '0 0 15px #ffff00',
              transition: 'all 0.1s ease',
              borderRadius: '3px'
            }} />
          </div>

          {/* Spread Shot Status Animation */}
          <div style={{
            marginTop: '6px',
            fontSize: '10px',
            color: '#ffff00',
            textAlign: 'center',
            animation: 'pulse 0.8s infinite',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            textShadow: '0 0 10px #ffff00'
          }}>
            ✦ 8-SHOT ✦
          </div>
        </div>

      {/* Score Display - Right Corner */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffff00',
        textShadow: '0 0 10px #ffff00',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '2px solid #ffff00',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 0 20px rgba(255, 255, 0, 0.5)',
        minWidth: '120px',
        textAlign: 'center'
      }}>
        <div style={{ 
          color: '#ff6600', 
          fontSize: '12px', 
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          SCORE
        </div>
        <div data-hud="score-value" style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#ffff00'
        }}>
          0
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </>
  )
}

export default HUD