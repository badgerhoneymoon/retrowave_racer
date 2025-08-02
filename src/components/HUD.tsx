interface HUDProps {
  speed: number
  isBoosted: boolean
  boostTimeRemaining: number
  score: number
  spreadShotActive: boolean
  spreadShotTimeRemaining: number
}

function HUD({ speed, isBoosted, boostTimeRemaining, score, spreadShotActive, spreadShotTimeRemaining }: HUDProps) {
  const speedPercent = Math.round((Math.abs(speed) / 1.125) * 100) // Max boosted speed is now ~1.125 (0.9 * 1.25)
  const boostSeconds = Math.max(0, Math.ceil(boostTimeRemaining / 1000))
  const spreadShotSeconds = Math.max(0, Math.ceil(spreadShotTimeRemaining / 1000))

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
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: isBoosted ? '#00ff00' : '#00ffff'
        }}>
          {speedPercent}%
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
          <div style={{
            width: `${Math.min(100, speedPercent)}%`,
            height: '100%',
            backgroundColor: isBoosted ? '#00ff00' : '#00ffff',
            boxShadow: isBoosted ? '0 0 10px #00ff00' : '0 0 10px #00ffff',
            transition: 'all 0.2s ease'
          }} />
        </div>
      </div>

      {/* Boost Display - Center Top - Only show when boosted */}
      {isBoosted && (
        <div style={{
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
          
          <div style={{ 
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#00ff00',
            marginBottom: '6px',
            textShadow: '0 0 20px #00ff00'
          }}>
            {boostSeconds}s
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
            <div style={{
              width: `${(boostTimeRemaining / 5000) * 100}%`,
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
      )}

      {/* Spread Shot Display - Center Top Right - Only show when active */}
      {spreadShotActive && (
        <div style={{
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
          
          <div style={{ 
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#ffff00',
            marginBottom: '6px',
            textShadow: '0 0 20px #ffff00'
          }}>
            {spreadShotSeconds}s
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
            <div style={{
              width: `${(spreadShotTimeRemaining / 5000) * 100}%`,
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
      )}

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
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#ffff00'
        }}>
          {score.toLocaleString()}
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