function ControlHints() {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#00ffff',
      textShadow: '0 0 4px rgba(0, 255, 255, 0.5)',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      border: '2px solid #ff00ff',
      borderRadius: '8px',
      padding: '16px 20px',
      boxShadow: '0 0 15px rgba(255, 0, 255, 0.4)',
      minWidth: '180px'
    }}>
      <div style={{ 
        color: '#ff6600', 
        fontSize: '13px', 
        marginBottom: '10px',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 102, 0, 0.5)',
        paddingBottom: '8px'
      }}>
        CONTROLS
      </div>

      {/* Movement Controls */}
      <div style={{ 
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{
          backgroundColor: 'rgba(255, 255, 0, 0.15)',
          border: '1px solid #ffff00',
          borderRadius: '4px',
          padding: '3px 8px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#ffff00',
          textShadow: '0 0 3px rgba(255, 255, 0, 0.4)',
          minWidth: '50px',
          textAlign: 'center'
        }}>
          WASD
        </span>
        <span style={{
          color: '#ffff00',
          fontSize: '15px',
          fontWeight: 'bold',
          textShadow: '0 0 3px rgba(255, 255, 0, 0.4)'
        }}>
          MOVEMENT
        </span>
      </div>

      {/* Plasma Gun */}
      <div style={{ 
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{
          backgroundColor: 'rgba(255, 0, 255, 0.15)',
          border: '1px solid #ff00ff',
          borderRadius: '4px',
          padding: '3px 8px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#ff00ff',
          textShadow: '0 0 3px rgba(255, 0, 255, 0.4)',
          minWidth: '50px',
          textAlign: 'center'
        }}>
          SPACE
        </span>
        <span style={{
          color: '#ff00ff',
          fontSize: '15px',
          fontWeight: 'bold',
          textShadow: '0 0 3px rgba(255, 0, 255, 0.4)'
        }}>
          PLASMA GUN
        </span>
      </div>

      {/* Rockets */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{
          backgroundColor: 'rgba(255, 68, 0, 0.15)',
          border: '1px solid #ff4400',
          borderRadius: '4px',
          padding: '3px 8px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#ff4400',
          textShadow: '0 0 3px rgba(255, 68, 0, 0.4)',
          minWidth: '50px',
          textAlign: 'center'
        }}>
          M
        </span>
        <span style={{
          color: '#ff4400',
          fontSize: '15px',
          fontWeight: 'bold',
          textShadow: '0 0 3px rgba(255, 68, 0, 0.4)'
        }}>
          ROCKETS
        </span>
      </div>

      {/* Sound Toggle */}
      <div style={{ 
        marginTop: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{
          backgroundColor: 'rgba(0, 255, 128, 0.12)',
          border: '1px solid #00ff80',
          borderRadius: '4px',
          padding: '3px 8px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#00ffbf',
          textShadow: '0 0 3px rgba(0, 255, 191, 0.4)',
          minWidth: '50px',
          textAlign: 'center'
        }}>
          R
        </span>
        <span style={{
          color: '#00ffbf',
          fontSize: '15px',
          fontWeight: 'bold',
          textShadow: '0 0 3px rgba(0, 255, 191, 0.4)'
        }}>
          SOUND
        </span>
      </div>
    </div>
  )
}

export default ControlHints